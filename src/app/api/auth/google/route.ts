import { NextResponse } from "next/server";

// Punto de entrada público del consentimiento OAuth de Google. jarvis-front
// es el único servicio expuesto a internet; le pide a tools-bridge (red
// Docker interna, dueño del client secret) la URL de consentimiento armada
// y redirige el navegador del usuario ahí.
export async function GET() {
  const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
  try {
    const res = await fetch(`${bridgeUrl}/api/auth/google/url`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || "tools-bridge no pudo generar la URL de consentimiento" },
        { status: 502 }
      );
    }
    return NextResponse.redirect(data.url);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `tools-bridge no alcanzable: ${err.message}` },
      { status: 502 }
    );
  }
}
