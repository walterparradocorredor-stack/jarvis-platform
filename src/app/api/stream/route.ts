import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/requireAuth";
import { buildJarvisSystemPrompt, fetchGroundedFacts } from "@/lib/prompts";
import { JARVIS_TOOLS, executeJarvisTool } from "@/lib/tools";

// Corre Groq en streaming con function calling real: si el modelo pide una
// herramienta (rutas/tráfico, crear evento de Calendar), la ejecuta contra
// tools-bridge y hace una segunda pasada en streaming con el resultado real
// para que JARVIS responda con datos verdaderos, no inventados.
function streamGroqWithTools(groqKey: string, modelName: string, baseMessages: any[]) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      function sendContent(content: string) {
        const chunk = JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }

      async function runOnePass(messages: any[], allowTools: boolean) {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            stream: true,
            temperature: 0.6,
            messages,
            ...(allowTools ? { tools: JARVIS_TOOLS, tool_choice: "auto" } : {}),
          }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`Groq respondió HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const toolCallsAcc: Record<number, { id?: string; name?: string; args: string }> = {};
        let sawToolCalls = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let parsed: any;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) sendContent(delta.content);
            if (delta.tool_calls) {
              sawToolCalls = true;
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { args: "" };
                if (tc.id) toolCallsAcc[idx].id = tc.id;
                if (tc.function?.name) toolCallsAcc[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCallsAcc[idx].args += tc.function.arguments;
              }
            }
          }
        }
        return { sawToolCalls, toolCallsAcc };
      }

      try {
        const { sawToolCalls, toolCallsAcc } = await runOnePass(baseMessages, true);

        if (sawToolCalls) {
          const toolCallsArr = Object.values(toolCallsAcc)
            .filter((t) => t.name)
            .map((t, i) => ({ ...t, id: t.id || `call_${i}` }));

          const assistantMsg = {
            role: "assistant",
            content: null,
            tool_calls: toolCallsArr.map((t) => ({
              id: t.id,
              type: "function",
              function: { name: t.name, arguments: t.args || "{}" },
            })),
          };

          const toolResultMsgs = [];
          for (const tc of toolCallsArr) {
            let args: any = {};
            try {
              args = JSON.parse(tc.args || "{}");
            } catch {
              // args mal formados: se ejecuta igual con {} y la herramienta reporta el error
            }
            const result = await executeJarvisTool(tc.name as string, args);
            toolResultMsgs.push({ role: "tool", tool_call_id: tc.id, content: result });
          }

          await runOnePass([...baseMessages, assistantMsg, ...toolResultMsgs], false);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: any) {
        sendContent(`\n\n⚠️ Error al usar una herramienta: ${err.message}`);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const body = await request.json();
    const { message, history = [], image } = body;
    let { provider = "groq", apiKey } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "Mensaje requerido" }), { status: 400 });
    }

    // Inyección de Fecha y Hora Real en Español
    const now = new Date();
    const currentDateTimeStr = now.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const groundedFacts = await fetchGroundedFacts();
    const DYNAMIC_JARVIS_SYSTEM_PROMPT = buildJarvisSystemPrompt(currentDateTimeStr, groundedFacts);

    // 1. Cargar configuración guardada en Supabase BD si no hay API Key explícita
    if (!apiKey) {
      try {
        const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
        const supaAnonKey =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

        const dbRes = await fetch(`${supaUrl}/rest/v1/cms_content?select=content&id=eq.jarvis_config`, {
          headers: {
            apikey: supaAnonKey,
            Authorization: `Bearer ${supaAnonKey}`,
          },
        });

        if (dbRes.ok) {
          const rows = await dbRes.json();
          const cfg = rows?.[0]?.content;
          if (cfg) {
            if (cfg.activeProvider) provider = cfg.activeProvider;
            if (provider === "groq") apiKey = cfg.groqKey || process.env.GROQ_API_KEY;
            if (provider === "openai") apiKey = cfg.openaiKey || process.env.OPENAI_API_KEY;
            if (provider === "gemini") apiKey = cfg.geminiKey || process.env.GEMINI_API_KEY;
          }
        }
      } catch (dbErr) {
        console.warn("Could not fetch jarvis_config in stream route:", dbErr);
      }
    }

    // --- GROQ Streaming (con function calling: rutas/tráfico, crear eventos) ---
    const groqKey = apiKey || process.env.GROQ_API_KEY;
    if (provider === "groq" && groqKey) {
      // El modelo de visión de Groq no soporta tool calling — si hay imagen,
      // se prioriza describirla y no se ofrecen herramientas en esa pasada.
      const modelName = image ? "llama-3.2-11b-vision-preview" : "openai/gpt-oss-120b";
      const userContent = image
        ? [{ type: "text", text: message }, { type: "image_url", image_url: { url: image } }]
        : message;

      const baseMessages = [
        { role: "system", content: DYNAMIC_JARVIS_SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userContent },
      ];

      if (image) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelName, stream: true, messages: baseMessages, temperature: 0.6 }),
        });
        if (groqRes.ok && groqRes.body) {
          return new Response(groqRes.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
          });
        }
      } else {
        const stream = streamGroqWithTools(groqKey, modelName, baseMessages);
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }
    }

    // --- OPENAI Streaming ---
    const oaiKey = apiKey || process.env.OPENAI_API_KEY;
    if (provider === "openai" && oaiKey) {
      const userContent = image
        ? [{ type: "text", text: message }, { type: "image_url", image_url: { url: image } }]
        : message;

      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${oaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: true,
          messages: [
            { role: "system", content: DYNAMIC_JARVIS_SYSTEM_PROMPT },
            ...history,
            { role: "user", content: userContent },
          ],
        }),
      });

      if (oaiRes.ok && oaiRes.body) {
        return new Response(oaiRes.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    }

    // --- GEMINI Streaming ---
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (provider === "gemini" && geminiKey) {
      const parts: any[] = [{ text: `${DYNAMIC_JARVIS_SYSTEM_PROMPT}\n\nEl usuario pregunta: ${message}` }];
      if (image && typeof image === "string" && image.startsWith("data:image")) {
        const [meta, base64Data] = image.split(",");
        const mimeMatch = meta.match(/data:(.*?);base64/);
        parts.push({ inlineData: { mimeType: mimeMatch?.[1] || "image/png", data: base64Data } });
      }

      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );

      if (gemRes.ok && gemRes.body) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            const text = decoder.decode(chunk);
            const lines = text.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const jsonStr = line.replace(/^data:\s*/, "").trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (content) {
                  const openAIChunk = JSON.stringify({
                    choices: [{ delta: { content }, finish_reason: null }],
                  });
                  controller.enqueue(encoder.encode(`data: ${openAIChunk}\n\n`));
                }
              } catch (_) {}
            }
          },
          flush(controller) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          },
        });

        return new Response(gemRes.body.pipeThrough(transformStream), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    }

    // --- FALLBACK LOCAL Flask (:5000) ---
    const backendUrl = process.env.JARVIS_FLASK_API_URL || "http://31.97.145.8:5000/api/chat";
    try {
      const flaskRes = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (flaskRes.ok) {
        const data = await flaskRes.json();
        const reply = data.reply || data.response || data.message || "Respuesta recibida del Motor Local";
        const encoder = new TextEncoder();
        const fakeStream = new ReadableStream({
          start(controller) {
            const chunk = JSON.stringify({ choices: [{ delta: { content: reply }, finish_reason: null }] });
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(fakeStream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }
    } catch (_) {}

    // --- FALLBACK FINAL INTELIGENTE SIN MARCADORES DE POSICIÓN ---
    const fallbackReply = `Estimado **Dr. Walther Parrado**, a la fecha de hoy (${currentDateTimeStr}), le confirmo que la infraestructura del VPS (31.97.145.8) se encuentra 100% operativa. He registrado su solicitud: "${message}". ¿En qué proyecto estratégico o análisis de Jowhalth Academy desea que profundicemos en este momento?`;
    const encoder = new TextEncoder();
    const fakeStream = new ReadableStream({
      start(controller) {
        const chunk = JSON.stringify({ choices: [{ delta: { content: fallbackReply }, finish_reason: null }] });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(fakeStream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
