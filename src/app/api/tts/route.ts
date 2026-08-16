import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";

// Voz Google Cloud Neural2 (es-US-Neural2-B) vía el tools-bridge del VPS.
// Si la API todavía no está habilitada para la key (restricción de API en
// Google Cloud Console), responde 502 con el error real — el VoiceModule
// hace fallback automático a la voz del navegador (SpeechSynthesis), nunca
// se inventa audio.
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Falta el texto a sintetizar" }, { status: 400 });
    }

    const res = await fetch(`${BRIDGE_URL}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json({ error: data.error || "Cloud TTS no disponible" }, { status: 502 });
    }

    const audioBuffer = Buffer.from(data.audioBase64, "base64");
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
