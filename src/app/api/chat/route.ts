import { NextRequest, NextResponse } from "next/server";
import { buildToolContext } from "@/lib/toolsIntent";
import { retrieveRelevantMemory, formatMemoryContext, saveMemory } from "@/lib/memory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;
    let { provider = "local", apiKey } = body;
    const conversationId = body.conversationId || "default";
    // Si el cliente eligió explícitamente un proveedor (selector, o el fix
    // automático de Cámara/Visión a Gemini), respetarlo — no dejar que la
    // config global de Supabase lo pise por debajo.
    const providerExplicit = Boolean(body.provider);

    // Datos reales de Gmail/Calendar/Maps si el mensaje los requiere (MCP bridge del VPS)
    const toolContext = message ? await buildToolContext(message) : null;
    // Memoria real de conversaciones anteriores (pgvector), no solo la sesión actual
    const memoryContext = message ? formatMemoryContext(await retrieveRelevantMemory(message)) : null;
    if (message) await saveMemory(conversationId, "user", message);

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

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    // Cargar configuración central de Supabase BD en VPS si no se envió API Key directa
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
          if (!providerExplicit && cfg.activeProvider) {
            provider = cfg.activeProvider;
          }
          if (!apiKey) {
            if (provider === "groq") apiKey = cfg.groqKey || process.env.GROQ_API_KEY;
            if (provider === "openai") apiKey = cfg.openaiKey || process.env.OPENAI_API_KEY;
            if (provider === "gemini") apiKey = cfg.geminiKey || process.env.GEMINI_API_KEY;
          }
        }
      }
    } catch (dbErr) {
      console.warn("Could not fetch jarvis_config from Supabase DB:", dbErr);
    }

    // 1. PROVIDER: Groq API (Ultra-rápido Llama 3.3 70B / Vision)
    if (provider === "groq") {
      const groqKey = apiKey || process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json(
          { error: "API Key de Groq no configurada en el panel del servidor" },
          { status: 400 }
        );
      }

      const { image } = body;
      const modelName = image ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

      const userContent = image
        ? [
            { type: "text", text: message },
            { type: "image_url", image_url: { url: image } },
          ]
        : message;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "system",
              content: finalSystemPrompt,
            },
            ...history,
            { role: "user", content: userContent },
          ],
          temperature: 0.7,
        }),
      });

      if (!groqRes.ok) {
        const errData = await groqRes.json();
        throw new Error(errData.error?.message || "Error en la API de Groq");
      }

      const groqData = await groqRes.json();
      const reply = groqData.choices?.[0]?.message?.content || "Sin respuesta";
      await saveMemory(conversationId, "assistant", reply);
      return NextResponse.json({ reply, provider: "groq" });
    }

    // 2. PROVIDER: OpenAI (GPT-4o)
    if (provider === "openai") {
      const oaiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!oaiKey) {
        return NextResponse.json(
          { error: "API Key de OpenAI no configurada" },
          { status: 400 }
        );
      }

      const { image } = body;
      const userContent = image
        ? [
            { type: "text", text: message },
            { type: "image_url", image_url: { url: image } },
          ]
        : message;

      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${oaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: finalSystemPrompt,
            },
            ...history,
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!oaiRes.ok) {
        const errData = await oaiRes.json();
        throw new Error(errData.error?.message || "Error en OpenAI");
      }

      const oaiData = await oaiRes.json();
      const reply = oaiData.choices?.[0]?.message?.content || "Sin respuesta";
      await saveMemory(conversationId, "assistant", reply);
      return NextResponse.json({ reply, provider: "openai" });
    }

    // 3. PROVIDER: Google Gemini
    if (provider === "gemini") {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return NextResponse.json(
          { error: "API Key de Gemini no configurada" },
          { status: 400 }
        );
      }

      const { image } = body;
      const parts: any[] = [{ text: `${finalSystemPrompt}\n\nEl usuario pregunta: ${message}` }];

      if (image && typeof image === "string" && image.startsWith("data:image")) {
        const [meta, base64Data] = image.split(",");
        const mimeMatch = meta.match(/data:(.*?);base64/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts,
              },
            ],
          }),
        }
      );

      if (!geminiRes.ok) {
        const errData = await geminiRes.json();
        throw new Error(errData.error?.message || "Error en Gemini API");
      }

      const geminiData = await geminiRes.json();
      const reply =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
      await saveMemory(conversationId, "assistant", reply);
      return NextResponse.json({ reply, provider: "gemini" });
    }

    // 4. DEFAULT: Local Llama 3.1 Python Flask API (VPS Puerto 5000)
    const backendUrl = process.env.JARVIS_FLASK_API_URL || "http://31.97.145.8:5000/api/chat";

    try {
      const flaskRes = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      if (flaskRes.ok) {
        const flaskData = await flaskRes.json();
        const reply = flaskData.reply || flaskData.response || flaskData.message;
        await saveMemory(conversationId, "assistant", reply);
        return NextResponse.json({
          reply,
          provider: "local",
        });
      }
    } catch (flaskErr) {
      console.warn("Flask Llama 3.1 local endpoint offline");
    }

    return NextResponse.json({
      reply: `🤖 **[JARVIS System]** Recibido: "${message}". El motor Llama 3.1 local (:5000) está respondiendo en modo standby. Para máxima velocidad y cero consumo de memoria VPS, selecciona **Groq API** o **Gemini** en el selector de proveedores.`,
      provider: "local",
    });
  } catch (error: any) {
    console.error("API Chat route error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno en el servidor JARVIS" },
      { status: 500 }
    );
  }
}
