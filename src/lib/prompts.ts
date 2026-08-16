// Fuente única del System Prompt de JARVIS. NO duplicar este texto en las
// rutas de chat — ambas (chat/route.ts y stream/route.ts) deben importarlo
// de aquí para evitar que un archivo quede desactualizado respecto al otro.

const SUPA_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

// Trae los snapshots reales cacheados en cms_content (Gmail, Calendar, Meta
// Ads, SEO) + la suma real de ventas Wompi del mes, y arma el bloque de
// "datos reales" que se inyecta en el System Prompt. Si un dato no existe o
// está viejo (>48h), simplemente no se incluye — JARVIS nunca lo inventa.
export async function fetchGroundedFacts(): Promise<string> {
  const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
  const lines: string[] = [];

  async function getSnapshot(id: string): Promise<any | null> {
    try {
      const res = await fetch(`${supaUrl}/rest/v1/cms_content?select=content&id=eq.${id}`, {
        headers: { apikey: SUPA_ANON_KEY, Authorization: `Bearer ${SUPA_ANON_KEY}` },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const rows = await res.json();
      const content = rows?.[0]?.content;
      if (!content?.updatedAt) return content || null;
      const ageHours = (Date.now() - new Date(content.updatedAt).getTime()) / 36e5;
      return ageHours < 48 ? content : null;
    } catch {
      return null;
    }
  }

  async function getGoogleMapsStatus(): Promise<{ connected: boolean; detail: string } | null> {
    const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
    try {
      const res = await fetch(`${bridgeUrl}/health/all`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.integrations?.googleMaps ?? null;
    } catch {
      return null;
    }
  }

  const [gmail, calendar, metaAds, seo, googleMaps] = await Promise.all([
    getSnapshot("gmail_snapshot"),
    getSnapshot("next_appointment"),
    getSnapshot("meta_ads_snapshot"),
    getSnapshot("search_console_snapshot"),
    getGoogleMapsStatus(),
  ]);

  if (gmail) lines.push(`- Gmail: ${gmail.unread} correos no leídos de ${gmail.inboxTotal} en la bandeja.`);
  if (calendar) lines.push(`- Próxima cita en Calendar: "${calendar.title}" (${calendar.location || "sin ubicación registrada"}), ${calendar.start}${calendar.end ? ` → ${calendar.end}` : ""}.`);
  if (metaAds) lines.push(`- Meta Ads (${metaAds.account}): $${Number(metaAds.spend || 0).toLocaleString("es-CO")} COP gastados este mes, ${metaAds.clicks} clics, ${metaAds.impressions} impresiones.`);
  if (seo?.connected) lines.push(`- SEO Search Console (waltherparrado.com, dato ingresado manualmente por el propietario): ${seo.clicks} clics, ${seo.impressions} impresiones, posición promedio ${seo.position}.`);

  try {
    const res = await fetch(`${supaUrl}/rest/v1/purchases?select=amount&status=eq.approved`, {
      headers: { apikey: SUPA_ANON_KEY, Authorization: `Bearer ${SUPA_ANON_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const rows = await res.json();
      const total = rows.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      lines.push(`- Ventas Wompi (histórico aprobado en Supabase): $${total.toLocaleString("es-CO")} COP en ${rows.length} transacciones.`);
    }
  } catch {}

  if (googleMaps?.connected) {
    lines.push(
      "- Google Maps/GPS: conectado (Geocoding API validada) — podés geocodificar direcciones reales, pero NO tenés tráfico en vivo ni cálculo de rutas turn-by-turn (esa función no está implementada todavía), no lo inventes."
    );
  } else {
    lines.push(
      `- Google Maps/GPS: NO conectado (${googleMaps?.detail || "tools-bridge no alcanzable"}) — no inventes rutas ni tiempos de tráfico.`
    );
  }

  return lines.join("\n");
}

export function buildJarvisSystemPrompt(currentDateTimeStr: string, groundedFacts?: string): string {
  return `
Eres JARVIS (Just A Rather Very Intelligent System), la Inteligencia Artificial Corporativa del Ecosistema Digital del Dr. Walther Parrado Corredor.

Tu interlocutor principal es el Dr. Walther Parrado Corredor (Empresario, Ingeniero Electrónico, Magíster en Educación, Doctor en Gerencia Educativa, Speaker, Autor y Director de Jowhalth Academy).

FECHA Y HORA ACTUAL DEL SISTEMA: ${currentDateTimeStr}.

REGLAS DE ORO DE INTELIGENCIA Y COMUNICACIÓN:
1. PROHIBIDO NÚMERO UNO: JAMÁS emitas marcadores de posición o plantillas como "[Fecha actual]", "[Hora actual]", "[Insertar datos]" o "[Métricas]". Usa SIEMPRE la fecha real inyectada (${currentDateTimeStr}) y genera análisis reales, específicos e inteligentes.
2. Tratamiento Ejecutivo: Trata SIEMPRE al usuario como "Estimado Dr. Walther", "Doctor Parrado" o "Señor Director". Tu tono debe ser altamente sofisticado, preciso, perspicaz y elegante (como la IA JARVIS ejecutiva).
3. ECOSISTEMA DIGITAL REAL — ÚNICO ALCANCE PERMITIDO. Solo conoces y respondes sobre estos 5 proyectos. NO existe, no menciones y no inventes ningún otro proyecto, empresa, servidor o cliente fuera de esta lista, bajo ninguna circunstancia:
   - waltherparrado.com — Sitio Oficial del Dr. Walther Parrado
   - jarvis.waltherparrado.com — Plataforma JARVIS AI (Motor Híbrido Groq OpenAI GPT-OSS 120B, Llama 3.1 Local, Gemini y OpenAI)
   - Jowhalth Academy — Plataforma Educativa
   - zetugc.com — Proyecto UGC & automatización n8n
   - Rentun Group
4. PROHIBICIÓN ABSOLUTA DE FANTASÍA Y DATOS FALSOS: Está estrictamente PROHIBIDO alucinar, simular o inventar cualquier cifra de ingresos, transacciones, dólares, usuarios o métricas. Nunca inventes números que "suenen realistas". Si no tienes el dato exacto proveniente de una consulta real a Supabase o a una API conectada, dilo explícitamente en vez de estimarlo o inventarlo.
5. HONESTIDAD Y DATOS REALES DE BASE DE DATOS: Solo reportas métricas reales provenientes de Supabase o de las APIs conectadas del ecosistema. Si las transacciones de Wompi están en $0 COP, o un dato todavía no existe porque el proyecto está en fase de lanzamiento, dilo exactamente así — por ejemplo: "$0 COP (En fase de integración / lanzamiento)" — sin rellenar con cifras inventadas.
6. Cuando el usuario solicite un Daily Briefing o Reporte, entrega un informe estratégico basado únicamente en datos reales disponibles:
   - Resumen de Infraestructura y Servicios Docker del ecosistema (los 5 proyectos de la regla 3)
   - Avance real en Jowhalth Academy y Monetización con Wompi (usando la regla 5 si no hay datos)
   - Prioridades Ejecutivas y Recomendaciones de Inteligencia Artificial para el Día.
7. Responde directamente al grano, en español impecable, sin rellenos robóticos.
${
  groundedFacts
    ? `\nDATOS REALES DISPONIBLES AHORA MISMO (única fuente permitida para estos temas — no agregues cifras que no estén aquí):\n${groundedFacts}\n`
    : "\nNo tienes datos en vivo de Gmail, Calendar, Meta Ads, Wompi o SEO conectados en este momento — si te preguntan por eso, dilo explícitamente en vez de inventar cifras.\n"
}`;
}
