import { NextRequest } from "next/server";
import { buildToolContext } from "@/lib/toolsIntent";
import { retrieveRelevantMemory, formatMemoryContext, saveMemory, wrapStreamWithMemorySave } from "@/lib/memory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [], image } = body;
    let { provider = "groq", apiKey } = body;
    const conversationId = body.conversationId || "default";
    // Si el cliente eligió explícitamente un proveedor (selector, o el fix
    // automático de Cámara/Visión a Gemini), respetarlo — no dejar que la
    // config global de Supabase lo pise por debajo.
    const providerExplicit = Boolean(body.provider);

    if (!message) {
      return new Response(JSON.stringify({ error: "Mensaje requerido" }), { status: 400 });
    }

    // Datos reales de Gmail/Calendar/Maps si el mensaje los requiere (MCP bridge del VPS)
    const toolContext = await buildToolContext(message);
    // Memoria real de conversaciones anteriores (pgvector), no solo la sesión actual
    const memoryContext = formatMemoryContext(await retrieveRelevantMemory(message));
    await saveMemory(conversationId, "user", message);

    // Inyección de Fecha y Hora Real en Español
    const now = new Date();
    const currentDateTimeStr = now.toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const DYNAMIC_JARVIS_SYSTEM_PROMPT = `
Eres JARVIS, el asistente de IA personal del Dr. Walther Parrado Corredor (Director de Jowhalth Academy, ecosistema JyM Tech Solutions). Sos su mano derecha digital, no un empleado de mostrador.

FECHA Y HORA ACTUAL: ${currentDateTimeStr}.

Cómo hablás:
- Como un colega de confianza que sabe mucho y va directo al grano — no como un formulario corporativo. Nada de repetir "Estimado Dr. Walther" o títulos formales en cada frase; usá su nombre solo cuando suene natural en la conversación, no como muletilla.
- Tus respuestas también se leen en voz alta (texto a voz): priorizá frases cortas y naturales por defecto, y solo extendete en listas o detalle largo si él lo pide o el tema realmente lo amerita.
- Español natural, sin relleno robótico ni frases de manual.

Reglas que no podés romper:
1. Nunca emitas marcadores de posición como "[Fecha actual]" o "[Insertar datos]" — ya tenés la fecha real arriba, usala.
2. Contexto del ecosistema (real, para cuando se necesite): sitio personal waltherparrado.com, Jowhalth Academy, esta misma plataforma en jarvis.waltherparrado.com (motor híbrido Groq/Gemini/OpenAI + motor local), facturación electrónica DIAN, agente de WhatsApp para Natural Slim.
3. Si piden un Daily Briefing: infraestructura, avance de Jowhalth Academy y Wompi, prioridades del día — sin inventar cifras que no tengas.
4. Si aparece un bloque "[DATOS REALES DE ...]", son datos reales obtenidos en vivo (Gmail/Calendar/Maps/etc.) vía las herramientas MCP del VPS: usalos exclusivamente para responder sobre ese tema, JAMÁS inventes remitentes, citas, distancias o tiempos que no estén ahí. Si aparece "[... NO DISPONIBLE]" o "[MAPS: falta ...]", comunica el problema real con honestidad, sin fabricar datos.
5. REGLA ABSOLUTA: nunca confirmes que ejecutaste una acción (crear/enviar/agendar/guardar algo) a menos que un bloque de este prompt confirme explícitamente que ocurrió de verdad (ej. "[TAREA CREADA REALMENTE ...]"). Si no ves esa confirmación, decí honestamente que esa acción no está conectada o no se pudo completar — nunca finjas haberla hecho.
6. Si aparece un bloque "[MEMORIA REAL DE CONVERSACIONES ANTERIORES ...]", son cosas reales que él dijo o que le respondiste antes — usalas para dar continuidad natural cuando sean relevantes, sin repetirlas palabra por palabra ni mencionarlas si no vienen al caso.
`;

    const contextBlocks = [toolContext, memoryContext].filter(Boolean).join("\n\n");
    const finalSystemPrompt = contextBlocks
      ? `${DYNAMIC_JARVIS_SYSTEM_PROMPT}\n\n${contextBlocks}`
      : DYNAMIC_JARVIS_SYSTEM_PROMPT;

    // 1. Cargar configuración guardada en Supabase BD si no hay API Key explícita
    if (!apiKey) {
      try {
        const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
        const supaAnonKey =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NTU1MTI0LCJleHAiOjIxMDE5MTUxMjR9.gxsX0XhFm7uw7JjCJ5NB1g4K9Z8V_pRUkaLPHQo6Ps0";

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
            if (!providerExplicit && cfg.activeProvider) provider = cfg.activeProvider;
            if (provider === "groq") apiKey = cfg.groqKey || process.env.GROQ_API_KEY;
            if (provider === "openai") apiKey = cfg.openaiKey || process.env.OPENAI_API_KEY;
            if (provider === "gemini") apiKey = cfg.geminiKey || process.env.GEMINI_API_KEY;
          }
        }
      } catch (dbErr) {
        console.warn("Could not fetch jarvis_config in stream route:", dbErr);
      }
    }

    // Si la imagen no se pudo analizar con ningún proveedor de visión, se
    // informa el error real en vez de caer en el fallback genérico de texto
    // (ese fallback fabricaría una respuesta que ignora la imagen adjunta).
    let lastVisionError: string | null = null;

    // --- GROQ Streaming ---
    const groqKey = apiKey || process.env.GROQ_API_KEY;
    if (provider === "groq" && groqKey) {
      const modelName = image ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
      const userContent = image
        ? [{ type: "text", text: message }, { type: "image_url", image_url: { url: image } }]
        : message;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          stream: true,
          messages: [
            { role: "system", content: finalSystemPrompt },
            ...history,
            { role: "user", content: userContent },
          ],
          temperature: 0.6,
        }),
      });

      if (groqRes.ok && groqRes.body) {
        return new Response(wrapStreamWithMemorySave(groqRes.body, conversationId), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      if (image) {
        try {
          const errBody = await groqRes.json();
          lastVisionError = errBody?.error?.message || `Groq respondió ${groqRes.status}`;
        } catch {
          lastVisionError = `Groq respondió ${groqRes.status}`;
        }
      }
    } else if (image && provider === "groq" && !groqKey) {
      lastVisionError = "API Key de Groq no configurada.";
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
            { role: "system", content: finalSystemPrompt },
            ...history,
            { role: "user", content: userContent },
          ],
        }),
      });

      if (oaiRes.ok && oaiRes.body) {
        return new Response(wrapStreamWithMemorySave(oaiRes.body, conversationId), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      if (image) {
        try {
          const errBody = await oaiRes.json();
          lastVisionError = errBody?.error?.message || `OpenAI respondió ${oaiRes.status}`;
        } catch {
          lastVisionError = `OpenAI respondió ${oaiRes.status}`;
        }
      }
    } else if (image && provider === "openai" && !oaiKey) {
      lastVisionError = "API Key de OpenAI no configurada.";
    }

    // --- GEMINI Streaming ---
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (provider === "gemini" && geminiKey) {
      const parts: any[] = [{ text: `${finalSystemPrompt}\n\nEl usuario pregunta: ${message}` }];
      if (image && typeof image === "string" && image.startsWith("data:image")) {
        const [meta, base64Data] = image.split(",");
        const mimeMatch = meta.match(/data:(.*?);base64/);
        parts.push({ inlineData: { mimeType: mimeMatch?.[1] || "image/png", data: base64Data } });
      }

      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
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

        return new Response(wrapStreamWithMemorySave(gemRes.body.pipeThrough(transformStream), conversationId), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      if (image) {
        try {
          const errBody = await gemRes.json();
          lastVisionError = errBody?.error?.message || `Gemini respondió ${gemRes.status}`;
        } catch {
          lastVisionError = `Gemini respondió ${gemRes.status}`;
        }
      }
    } else if (image && provider === "gemini" && !geminiKey) {
      lastVisionError = "API Key de Gemini no configurada.";
    }

    // Imagen adjunta pero ningún proveedor de visión pudo procesarla: se
    // informa el motivo real (el motor local/Flask no soporta imágenes),
    // en vez de responder como si la imagen no existiera.
    if (image && lastVisionError) {
      const encoder = new TextEncoder();
      const errStream = new ReadableStream({
        start(controller) {
          const text = `⚠️ **No se pudo analizar la imagen.** Motivo real: ${lastVisionError}\n\nEl motor local (Qwen 2.5 14B) no procesa imágenes. Selecciona Gemini u OpenAI con una API Key válida configurada, o usa Groq si tu cuenta tiene un modelo de visión activo.`;
          const chunk = JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: null }] });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(errStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
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
        await saveMemory(conversationId, "assistant", reply);
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
    const fallbackReply = `Recibí tu mensaje ("${message}") pero ningún motor de IA respondió a tiempo (${currentDateTimeStr}). Puede ser la conexión o que falte una API key configurada — ¿querés que lo intente de nuevo?`;
    await saveMemory(conversationId, "assistant", fallbackReply);
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
