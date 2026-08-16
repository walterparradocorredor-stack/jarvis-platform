import { NextResponse } from "next/server";

// Punto de entrada público del consentimiento OAuth de Microsoft (Outlook/
// Hotmail personales, endpoint "consumers"). Mismo patrón que Google: jarvis-
// front pide a tools-bridge la URL armada (dueño del client secret) y
// redirige el navegador ahí.
//
// Siempre responde 200 (nunca 502/500): un status de error acá lo intercepta
// Cloudflare con su propia página genérica de "Bad Gateway" en vez de mostrar
// el mensaje real — mismo criterio que ya se aplicó a /api/tools/*. Mientras
// no exista MICROSOFT_CLIENT_ID/SECRET real (App Registration pendiente en
// Azure Portal), esto muestra una página honesta explicando eso, no un error
// críptico.
export async function GET() {
  const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
  try {
    const res = await fetch(`${bridgeUrl}/api/auth/microsoft/url`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return renderResult(
        false,
        "Outlook/Hotmail todavía no está configurado: falta crear el App Registration en portal.azure.com (cuentas personales) y cargar el Client ID/Secret reales."
      );
    }
    return NextResponse.redirect(data.url);
  } catch (err: any) {
    return renderResult(false, `tools-bridge no alcanzable: ${err.message}`);
  }
}

function renderResult(ok: boolean, message: string) {
  const title = ok ? "Conectado" : "Outlook aún no disponible";
  const color = ok ? "#16a34a" : "#f59e0b";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title} · JARVIS</title></head>
<body style="font-family: system-ui, sans-serif; background:#0b0f14; color:#e5e7eb; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
  <div style="text-align:center; max-width: 420px; padding: 0 1.5rem;">
    <h1 style="color:${color}; margin-bottom: .5rem;">${title}</h1>
    <p style="opacity:.85;">${escapeHtml(message)}</p>
    <p style="opacity:.5; font-size:.85rem; margin-top:1.5rem;">Podés cerrar esta pestaña.</p>
  </div>
</body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}
