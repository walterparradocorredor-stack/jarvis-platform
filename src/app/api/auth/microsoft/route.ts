import { NextResponse } from "next/server";

// Punto de entrada público del consentimiento OAuth de Microsoft (Outlook/
// Hotmail personales, endpoint "consumers"). Mismo patrón que Google: jarvis-
// front pide a tools-bridge la URL armada (dueño del client secret) y
// redirige el navegador ahí.
export async function GET() {
  const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
  try {
    const res = await fetch(`${bridgeUrl}/api/auth/microsoft/url`, {
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
