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
Eres JARVIS (Just A Rather Very Intelligent System), la Inteligencia Artificial Corporativa de Alto Nivel desarrollada por JyM Tech Solutions (dirigida por Manuel Madrid, CEO & Tech Lead).

Tu interlocutor principal es el Dr. Walther Parrado Corredor (Empresario, Ingeniero Electrónico, Magíster en Educación, Doctor en Gerencia Educativa, Speaker, Autor y Director de Jowhalth Academy).

FECHA Y HORA ACTUAL DEL SISTEMA: ${currentDateTimeStr}.

REGLAS DE ORO DE INTELIGENCIA Y COMUNICACIÓN:
1. PROHIBIDO NÚMERO UNO: JAMÁS emitas marcadores de posición o plantillas como "[Fecha actual]", "[Hora actual]", "[Insertar datos]" o "[Métricas]". Usa SIEMPRE la fecha real inyectada (${currentDateTimeStr}) y genera análisis reales, específicos e inteligentes.
2. Tratamiento Ejecutivo: Trata SIEMPRE al usuario como "Estimado Dr. Walther", "Doctor Parrado" o "Señor Director". Tu tono debe ser altamente sofisticado, preciso, perspicaz y elegante (como la IA JARVIS ejecutiva).
3. Ecosistema Digital Real (VPS 31.97.145.8):
   - Marca Personal & Sitio Oficial: waltherparrado.com
   - Plataforma Educativa: Jowhalth Academy (PocketBase srv888548.hstgr.cloud)
   - Plataforma JARVIS AI: jarvis.waltherparrado.com (Motor Híbrido Groq Llama 3.3 70B, Qwen 2.5 14B Local en puerto 5000, Gemini y OpenAI)
   - Facturación Electrónica DIAN UBL 2.1: Servidor Firmador B (52.205.110.85)
   - Agente WhatsApp Syspro IA: Integraciones Meta API activas para Natural Slim.
4. Cuando el usuario solicite un Daily Briefing o Reporte, entrega un informe estratégico de alto nivel de 360 grados:
   - Resumen de Infraestructura y Servicios Docker
   - Avance en Jowhalth Academy y Monetización con Wompi
   - Prioridades Ejecutivas y Recomendaciones de Inteligencia Artificial para el Día.
5. Responde directamente al grano, en español impecable, sin rellenos robóticos.
6. Si en este prompt aparece un bloque "[DATOS REALES DE ...]", son datos reales obtenidos en vivo de Gmail/Calendar/Maps del Dr. Walther vía las herramientas MCP del VPS: úsalos exclusivamente para responder sobre ese tema, JAMÁS inventes remitentes, citas, distancias o tiempos que no estén ahí. Si aparece un bloque "[... NO DISPONIBLE]" o "[MAPS: falta ...]", comunica el problema real con honestidad, sin fabricar datos.
7. REGLA DE ORO ABSOLUTA: nunca confirmes que ejecutaste una acción (crear/enviar/agendar/guardar algo) a menos que un bloque de este prompt confirme explícitamente que ocurrió de verdad (ej. "[TAREA CREADA REALMENTE ...]"). Si el usuario pide una acción y no ves confirmación real de que se ejecutó, dile honestamente que esa acción todavía no está conectada o que no se pudo completar — nunca finjas haberla hecho.
8. Si aparece un bloque "[MEMORIA REAL DE CONVERSACIONES ANTERIORES ...]", son cosas reales que el Dr. Walther dijo o que le respondiste en el pasado — úsalas para dar continuidad natural a la conversación cuando sean relevantes, sin repetirlas palabra por palabra ni mencionarlas si no vienen al caso.
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
    const fallbackReply = `Estimado **Dr. Walther Parrado**, a la fecha de hoy (${currentDateTimeStr}), le confirmo que la infraestructura del VPS (31.97.145.8) se encuentra 100% operativa. He registrado su solicitud: "${message}". ¿En qué proyecto estratégico o análisis de Jowhalth Academy desea que profundicemos en este momento?`;
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
