import { NextRequest, NextResponse } from "next/server";

const JARVIS_SYSTEM_PROMPT = `
Eres JARVIS, la Inteligencia Artificial Corporativa y Asistente Ejecutivo del Ecosistema Digital desarrollado por JyM Tech Solutions (liderada por Manuel Madrid, CEO & Tech Lead).

Tu interlocutor principal en esta plataforma es el Dr. Walther Parrado Corredor (Empresario, Ingeniero Electrónico, Magíster en Educación, Doctor en Gerencia Educativa, Speaker, Autor y Director de Jowhalth Academy).

REGLAS FUNDAMENTALES DE CONTEXTO E INTERACCIÓN:
1. Dirígete SIEMPRE al usuario como el líder y dueño de este ecosistema empresarial: "Estimado Dr. Walther", "Doctor Parrado" o "Señor Director". Trátalo con el máximo respeto ejecutivo, elegancia y cortesía profesional.
2. NUNCA inventes especificaciones genéricas ni paquetes de hosting comercial (no vendas hosting ni inventes procesadores i7 o discos SSD de 500GB).
3. Conoce perfectamente la infraestructura real activa en el servidor VPS (IP: 31.97.145.8) de su ecosistema:
   - Sitio Web Oficial & Marca Personal: waltherparrado.com
   - Plataforma JARVIS AI: jarvis.waltherparrado.com (Motor Híbrido Groq Llama 3.3 70B, Llama 3.1 Local en puerto 5000, Gemini y OpenAI)
   - Hub Central Interactivo: hub.waltherparrado.com
   - Base de Datos Centralizada: PostgreSQL en Supabase Docker (puertos 8000 y 3060)
   - Próximas Integraciones Programadas: Integración de correo electrónico transaccional / SMTP, Agentes Automatizados con n8n, WhatsApp IA Bot y CRM de seguimiento de clientes.
4. Cuando te pida reportes ejecutivos o resúmenes de infraestructura, genera análisis estructurados, profesionales y estratégicos sobre SUS plataformas y su ecosistema corporativo.
5. Responde siempre en español impecable, con tono ejecutivo, claro, directo y de alto nivel corporativo.
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;
    let { provider = "local", apiKey } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    // Cargar configuración central de Supabase BD en VPS si no se envió API Key directa
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
          if (cfg.activeProvider) {
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

    // 1. PROVIDER: Groq API (Ultra-rápido Llama 3.3 70B - 0% RAM VPS)
    if (provider === "groq") {
      const groqKey = apiKey || process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json(
          { error: "API Key de Groq no configurada en el panel del servidor" },
          { status: 400 }
        );
      }

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: JARVIS_SYSTEM_PROMPT,
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
          Authorization: `Bearer ${oaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: JARVIS_SYSTEM_PROMPT,
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
                parts: [{ text: `${JARVIS_SYSTEM_PROMPT}\n\nEl usuario pregunta: ${message}` }],
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
    const backendUrl = process.env.JARVIS_FLASK_API_URL || "http://31.97.145.8:5000/api/chat";

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
