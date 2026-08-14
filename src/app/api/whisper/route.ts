import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Archivo de audio no recibido" }, { status: 400 });
    }

    // 1. Obtener API key de Groq o Supabase DB
    let groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
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
          groqKey = rows?.[0]?.content?.groqKey || process.env.GROQ_API_KEY;
        }
      } catch (_) {}
    }

    // 2. Transcripción con Groq Whisper Large v3 Turbo (Velocidad Ultra-Rápida 0.1s)
    if (groqKey) {
      const groqFormData = new FormData();
      groqFormData.append("file", file, "audio.webm");
      groqFormData.append("model", "whisper-large-v3-turbo");
      groqFormData.append("language", "es");
      groqFormData.append("response_format", "json");

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: groqFormData,
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        return NextResponse.json({
          text: data.text || "",
          engine: "Groq Whisper Large v3 Turbo",
        });
      }
    }

    // 3. Fallback con OpenAI Whisper
    const oaiKey = process.env.OPENAI_API_KEY;
    if (oaiKey) {
      const oaiFormData = new FormData();
      oaiFormData.append("file", file, "audio.webm");
      oaiFormData.append("model", "whisper-1");
      oaiFormData.append("language", "es");

      const oaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${oaiKey}`,
        },
        body: oaiFormData,
      });

      if (oaiRes.ok) {
        const data = await oaiRes.json();
        return NextResponse.json({
          text: data.text || "",
          engine: "OpenAI Whisper-1",
        });
      }
    }

    // 4. Fallback con Motor Flask Local en VPS (:5000)
    const backendUrl = process.env.JARVIS_FLASK_API_URL || "http://31.97.145.8:5000/api/transcribe";
    try {
      const flaskRes = await fetch(backendUrl, {
        method: "POST",
        body: formData,
      });
      if (flaskRes.ok) {
        const data = await flaskRes.json();
        return NextResponse.json({
          text: data.text || data.transcription || "",
          engine: "Flask Local Whisper",
        });
      }
    } catch (_) {}

    return NextResponse.json({ error: "No se pudo procesar el audio con Whisper" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
