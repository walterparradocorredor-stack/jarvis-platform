// Cliente del "tools bridge" interno (127.0.0.1:4010 en el VPS, expuesto al
// contenedor como host.docker.internal:4010): expone datos REALES de Gmail,
// Calendar y Maps ya autorizados contra la cuenta del Dr. Walther, para que
// el chat y los botones ejecutivos nunca tengan que inventar esta información.

const BRIDGE_URL = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";

async function bridgeFetch(path: string) {
  const res = await fetch(`${BRIDGE_URL}${path}`, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  return { ok: res.ok && data.ok !== false, data, status: res.status };
}

export interface ToolsStatus {
  gmail: "ok" | "not_configured";
  calendar: "ok" | "not_configured";
  maps: "ok" | "pending";
  mapsError: string | null;
  whatsapp: "ok" | "not_configured";
  youtube: "ok" | "pending";
  youtubeError: string | null;
}

// tools-bridge (Express real de este VPS, puerto 4100) expone el estado rico
// en /health/all con otra forma (integrations.googleCalendar/gmail/googleMaps/
// youtube) — se traduce acá en vez de duplicar otro endpoint.
export async function getToolsStatus(): Promise<ToolsStatus> {
  try {
    const res = await fetch(`${BRIDGE_URL}/health/all`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const integrations = data.integrations || {};
    return {
      gmail: integrations.gmail?.connected ? "ok" : "not_configured",
      calendar: integrations.googleCalendar?.connected ? "ok" : "not_configured",
      maps: integrations.googleMaps?.connected ? "ok" : "pending",
      mapsError: integrations.googleMaps?.connected ? null : integrations.googleMaps?.detail || null,
      whatsapp: "not_configured",
      youtube: integrations.youtube?.connected ? "ok" : "pending",
      youtubeError: integrations.youtube?.connected ? null : integrations.youtube?.detail || null,
    };
  } catch {
    return {
      gmail: "not_configured",
      calendar: "not_configured",
      maps: "pending",
      mapsError: "Bridge de herramientas no disponible",
      whatsapp: "not_configured",
      youtube: "pending",
      youtubeError: "Bridge de herramientas no disponible",
    };
  }
}

export async function getSupabaseHealth(): Promise<boolean> {
  try {
    const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
    // OJO: pegarle a la raíz "/rest/v1/" (sin nada después) cae en la ruta
    // "rest-v1-openapi" de Kong, que este VPS restringe a ACL "admin" —
    // la key "anon" siempre da 403 ahí aunque Supabase esté sano. Hay que
    // apuntar a una tabla real para caer en la ruta "rest-v1" (ACL admin+anon).
    const res = await fetch(`${supaUrl}/rest/v1/cms_content?select=id&limit=1`, {
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
      },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export interface EmailSummaryItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  category: "Prioritarios" | "Clientes" | "Solicitudes" | "Spam";
}

export async function getGmailSummary(): Promise<{ ok: boolean; items?: EmailSummaryItem[]; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch("/gmail/summary");
    return ok ? { ok: true, items: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
}

export async function getCalendarAgenda(
  range: "today" | "week" = "today"
): Promise<{ ok: boolean; items?: CalendarEventItem[]; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch(`/calendar/agenda?range=${range}`);
    return ok ? { ok: true, items: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function createCalendarEvent(params: {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}): Promise<{ ok: boolean; link?: string; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/calendar/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return res.ok && data.ok ? { ok: true, link: data.data?.link } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/calendar/event/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return res.ok && data.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function updateCalendarEvent(
  eventId: string,
  params: { title?: string; startTime?: string; endTime?: string; description?: string; location?: string }
): Promise<{ ok: boolean; link?: string; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/calendar/event/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return res.ok && data.ok ? { ok: true, link: data.data?.link } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export interface RouteInfo {
  distance: string;
  duration: string;
  durationInTraffic: string;
  summary: string;
}

export interface NearbyPlace {
  name: string;
  address: string;
  rating: number | null;
  openNow: boolean | null;
}

export async function getPlacesNearby(
  lat: number,
  lng: number,
  type = "restaurant"
): Promise<{ ok: boolean; places?: NearbyPlace[]; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch(`/places/nearby?lat=${lat}&lng=${lng}&type=${encodeURIComponent(type)}`);
    return ok ? { ok: true, places: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export interface CurrentWeather {
  description: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number | null;
}

export async function getWeatherCurrent(
  lat: number,
  lng: number
): Promise<{ ok: boolean; weather?: CurrentWeather; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch(`/weather/current?lat=${lat}&lng=${lng}`);
    return ok ? { ok: true, weather: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  due: string | null;
  status: "needsAction" | "completed";
}

export async function getTasks(): Promise<{ ok: boolean; tasks?: TaskItem[]; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch("/tasks");
    return ok ? { ok: true, tasks: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function createTaskRemote(
  title: string,
  notes?: string,
  due?: string
): Promise<{ ok: boolean; task?: TaskItem; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes, due }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return res.ok && data.ok ? { ok: true, task: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export interface SearchPerformance {
  siteUrl: string;
  periodDays: number;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
}

export async function getSearchConsolePerformance(
  siteUrl?: string,
  days = 28
): Promise<{ ok: boolean; performance?: SearchPerformance; error?: string }> {
  try {
    const qs = new URLSearchParams({ days: String(days), ...(siteUrl ? { siteUrl } : {}) });
    const { ok, data } = await bridgeFetch(`/search-console/performance?${qs}`);
    return ok ? { ok: true, performance: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export interface ChannelMetrics {
  title: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  latestVideos: { title: string; publishedAt: string; videoId: string }[];
}

export async function getYoutubeChannelMetrics(): Promise<{ ok: boolean; metrics?: ChannelMetrics; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch("/youtube/channel-metrics");
    return ok ? { ok: true, metrics: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function getMapsRoute(
  origin: string,
  destination: string
): Promise<{ ok: boolean; route?: RouteInfo; error?: string }> {
  try {
    const { ok, data } = await bridgeFetch(
      `/maps/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );
    return ok ? { ok: true, route: data.data } : { ok: false, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
