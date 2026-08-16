import { NextRequest, NextResponse } from "next/server";

// Microsoft redirige acá (URL pública registrada en el App Registration de
// Azure). Reenviamos code/state server-to-server a tools-bridge, que hace el
// canje real y persiste el refresh token; acá solo mostramos el resultado.
export async function GET(req: NextRequest) {
  const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
  const qs = req.nextUrl.search;
  try {
    const res = await fetch(`${bridgeUrl}/api/auth/microsoft/callback${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return renderResult(data.ok, data.ok ? data.message : data.error);
  } catch (err: any) {
    return renderResult(false, `tools-bridge no alcanzable: ${err.message}`);
  }
}

function renderResult(ok: boolean, message: string) {
  const title = ok ? "Conectado" : "Error";
  const color = ok ? "#16a34a" : "#dc2626";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title} · JARVIS</title></head>
<body style="font-family: system-ui, sans-serif; background:#0b0f14; color:#e5e7eb; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
  <div style="text-align:center; max-width: 420px; padding: 0 1.5rem;">
    <h1 style="color:${color}; margin-bottom: .5rem;">${title}</h1>
    <p style="opacity:.85;">${escapeHtml(message)}</p>
    <p style="opacity:.5; font-size:.85rem; margin-top:1.5rem;">Podés cerrar esta pestaña.</p>
  </div>
</body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}
