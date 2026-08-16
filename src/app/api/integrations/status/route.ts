import { NextResponse } from "next/server";

// Proxy server-side hacia tools-bridge (red interna Docker, sin puerto expuesto
// al exterior). El navegador nunca llama directamente a tools-bridge.
export async function GET() {
  const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
  const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
  const supaAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

  let integrations: Record<string, { connected: boolean; detail: string }> = {
    googleCalendar: { connected: false, detail: "tools-bridge no alcanzable" },
    gmail: { connected: false, detail: "tools-bridge no alcanzable" },
    googleMaps: { connected: false, detail: "tools-bridge no alcanzable" },
    youtube: { connected: false, detail: "tools-bridge no alcanzable" },
    rag: { connected: false, detail: "tools-bridge no alcanzable" },
    outlook: { connected: false, detail: "tools-bridge no alcanzable" },
  };

  try {
    const res = await fetch(`${bridgeUrl}/health/all`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`tools-bridge respondió HTTP ${res.status}`);
    const data = await res.json();
    integrations = data.integrations;
  } catch (err: any) {
    // tools-bridge caído/no desplegado aún: se reportan todas las
    // integraciones como no conectadas, sin fingir estado verde.
  }

  // Snapshots cacheados (Meta Ads, Calendar, Gmail): no pasan por tools-bridge
  // porque su OAuth propio en el VPS aún no existe. Se refrescan con datos
  // reales obtenidos vía MCP y quedan "conectados" solo si el snapshot existe
  // y tiene menos de 48h — nunca se finge verde sin datos reales detrás.
  async function freshSnapshot(id: string): Promise<{ content: any; ageHours: number } | null> {
    try {
      const dbRes = await fetch(`${supaUrl}/rest/v1/cms_content?select=content&id=eq.${id}`, {
        headers: { apikey: supaAnonKey, Authorization: `Bearer ${supaAnonKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!dbRes.ok) return null;
      const rows = await dbRes.json();
      const content = rows?.[0]?.content;
      if (!content?.updatedAt) return null;
      return { content, ageHours: (Date.now() - new Date(content.updatedAt).getTime()) / 36e5 };
    } catch {
      return null;
    }
  }

  let metaAds = { connected: false, detail: "Snapshot de Meta Ads no disponible" };
  const metaSnap = await freshSnapshot("meta_ads_snapshot");
  if (metaSnap) {
    metaAds =
      metaSnap.ageHours < 48
        ? {
            connected: true,
            detail: `${metaSnap.content.account || "Meta Ads"} · $${Number(
              metaSnap.content.spend || 0
            ).toLocaleString("es-CO")} COP este mes`,
          }
        : { connected: false, detail: "Snapshot de Meta Ads desactualizado (>48h)" };
  }

  // Google Calendar: verificado vía el conector de Calendar del propio
  // asistente (evento real leído), cacheado en next_appointment. El badge
  // del VPS/tools-bridge (OAuth propio, con refresh token) sigue disponible
  // como fallback si esta vía cae.
  const calSnap = await freshSnapshot("next_appointment");
  if (calSnap) {
    integrations.googleCalendar =
      calSnap.ageHours < 48
        ? { connected: true, detail: `Evento real sincronizado: "${calSnap.content.title}"` }
        : integrations.googleCalendar;
  }

  // Gmail: verificado vía el conector de Gmail del propio asistente
  // (bandeja real leída), cacheado en gmail_snapshot.
  const gmailSnap = await freshSnapshot("gmail_snapshot");
  if (gmailSnap) {
    integrations.gmail =
      gmailSnap.ageHours < 48
        ? {
            connected: true,
            detail: `${gmailSnap.content.unread} no leídos de ${gmailSnap.content.inboxTotal} en bandeja`,
          }
        : integrations.gmail;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    integrations: { ...integrations, metaAds },
  });
}
