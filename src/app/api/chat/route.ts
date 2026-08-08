import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, provider = "local", apiKey, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    // 1. PROVIDER: Groq API (Ultra-rápido Llama 3.3 70B - 0% RAM VPS)
    if (provider === "groq") {
      const groqKey = apiKey || process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json(
          { error: "API Key de Groq no configurada" },
          { status: 400 }
        );
      }

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Eres JARVIS, el Asistente Ejecutivo e Inteligencia Artificial Corporativa de JyM Tech Solutions. Eres sumamente profesional, analítico, eficiente, elegante y hablas siempre en español impecable.",
            },
            ...history,
            { role: "user", content: message },
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

      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${oaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Eres JARVIS, la IA Corporativa de JyM Tech Solutions. Responde en español con precisión estratégica.",
            },
            ...history,
            { role: "user", content: message },
          ],
        }),
      });

      if (!oaiRes.ok) {
        const errData = await oaiRes.json();
        throw new Error(errData.error?.message || "Error en OpenAI");
      }

      const oaiData = await oaiRes.json();
      const reply = oaiData.choices?.[0]?.message?.content || "Sin respuesta";
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

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `Eres JARVIS de JyM Tech Solutions. El usuario pregunta: ${message}` }],
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
      return NextResponse.json({ reply, provider: "gemini" });
    }

    // 4. DEFAULT: Local Llama 3.1 Python Flask API (VPS Puerto 5000)
    const backendUrl =
      process.env.JARVIS_FLASK_API_URL ||
      "http://31.97.145.8:5000/api/chat";

    try {
      const flaskRes = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      if (flaskRes.ok) {
        const flaskData = await flaskRes.json();
        return NextResponse.json({
          reply: flaskData.reply || flaskData.response || flaskData.message,
          provider: "local",
        });
      }
    } catch (flaskErr) {
      console.warn("Flask Llama 3.1 local endpoint offline, using smart fallback");
    }

    // Smart Fallback response if local Flask is offline and no external key provided
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
