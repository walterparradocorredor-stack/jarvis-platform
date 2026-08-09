import { NextRequest } from "next/server";

const JARVIS_SYSTEM_PROMPT = `
Eres JARVIS, la Inteligencia Artificial Corporativa y Asistente Ejecutivo del Ecosistema Digital desarrollado por JyM Tech Solutions (liderada por Manuel Madrid, CEO & Tech Lead).

Tu interlocutor principal en esta plataforma es el Dr. Walther Parrado Corredor (Empresario, Ingeniero Electrónico, Magíster en Educación, Doctor en Gerencia Educativa, Speaker, Autor y Director de Jowhalth Academy).

REGLAS FUNDAMENTALES DE CONTEXTO E INTERACCIÓN:
1. Dirígete SIEMPRE al usuario como el líder y dueño de este ecosistema empresarial: "Estimado Dr. Walther", "Doctor Parrado" o "Señor Director". Trátalo con el máximo respeto ejecutivo, elegancia y cortesía profesional.
2. NUNCA inventes especificaciones genéricas ni paquetes de hosting comercial (no vendas hosting ni inventes procesadores i7 o discos SSD de 500GB).
3. Conoce perfectamente la infraestructura real activa en el servidor VPS (IP: 31.97.145.8) de su ecosistema.
4. Cuando te pida reportes ejecutivos o resúmenes de infraestructura, genera análisis estructurados, profesionales y estratégicos sobre SUS plataformas y su ecosistema corporativo.
5. Responde siempre en español impecable, con tono ejecutivo, claro, directo y de alto nivel corporativo.
`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, history = [], image } = body;
  let { provider = "local", apiKey } = body;

  if (!message) {
    return new Response(JSON.stringify({ error: "Mensaje requerido" }), { status: 400 });
  }

  // --- GROQ Streaming ---
  if (provider === "groq") {
    const groqKey = apiKey || process.env.GROQ_API_KEY;
    if (!groqKey) return new Response("API Key Groq no configurada", { status: 400 });

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
          { role: "system", content: JARVIS_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok || !groqRes.body) {
      const err = await groqRes.text();
      return new Response(err, { status: groqRes.status });
    }

    return new Response(groqRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // --- OPENAI Streaming ---
  if (provider === "openai") {
    const oaiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!oaiKey) return new Response("API Key OpenAI no configurada", { status: 400 });

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
          { role: "system", content: JARVIS_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!oaiRes.ok || !oaiRes.body) {
      const err = await oaiRes.text();
      return new Response(err, { status: oaiRes.status });
    }

    return new Response(oaiRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // --- GEMINI Streaming ---
  if (provider === "gemini") {
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) return new Response("API Key Gemini no configurada", { status: 400 });

    const parts: any[] = [{ text: `${JARVIS_SYSTEM_PROMPT}\n\nEl usuario pregunta: ${message}` }];
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

    if (!gemRes.ok || !gemRes.body) {
      const err = await gemRes.text();
      return new Response(err, { status: gemRes.status });
    }

    // Transformar formato Gemini SSE → formato OpenAI SSE para reutilizar mismo parser en el cliente
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
              // Emitir como formato OpenAI SSE compatible
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

  // --- LOCAL Flask Fallback (no streaming) envuelto en SSE ---
  const backendUrl = process.env.JARVIS_FLASK_API_URL || "http://31.97.145.8:5000/api/chat";
  try {
    const flaskRes = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (flaskRes.ok) {
      const data = await flaskRes.json();
      const reply = data.reply || data.response || data.message || "";
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

  // Fallback final
  const fallbackReply = `🤖 **[JARVIS System]** Motor local (:5000) en standby. Selecciona **Groq** o **Gemini** para máxima velocidad.`;
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
}
