import type {
  EmailSummaryItem,
  CalendarEventItem,
  RouteInfo,
  NearbyPlace,
  CurrentWeather,
  TaskItem,
  SearchPerformance,
  ChannelMetrics,
} from "./toolsBridge";

const CATEGORY_EMOJI: Record<EmailSummaryItem["category"], string> = {
  Prioritarios: "🔴",
  Clientes: "💼",
  Solicitudes: "📩",
  Spam: "🗑️",
};

export function formatGmailSummary(items: EmailSummaryItem[]): string {
  if (items.length === 0) {
    return "📧 **Bandeja de entrada**: no hay correos no leídos en las últimas 24 horas.";
  }
  const byCategory = items.reduce<Record<string, EmailSummaryItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  let out = `📧 **Correos no leídos (últimas 24h): ${items.length}**\n\n`;
  for (const category of ["Prioritarios", "Clientes", "Solicitudes", "Spam"] as const) {
    const group = byCategory[category];
    if (!group?.length) continue;
    out += `${CATEGORY_EMOJI[category]} **${category}** (${group.length})\n`;
    for (const item of group.slice(0, 8)) {
      out += `- **${item.from.replace(/<.*?>/, "").trim()}** — ${item.subject}\n`;
    }
    out += "\n";
  }
  return out.trim();
}

export function formatCalendarAgenda(items: CalendarEventItem[], range: "today" | "week"): string {
  const label = range === "week" ? "próximos 7 días" : "hoy";
  if (items.length === 0) {
    return `📅 **Agenda (${label})**: no hay citas ni reuniones programadas.`;
  }
  let out = `📅 **Agenda (${label}): ${items.length} evento(s)**\n\n`;
  for (const item of items) {
    const start = new Date(item.start);
    const time = isNaN(start.getTime())
      ? item.start
      : start.toLocaleString("es-CO", { timeZone: "America/Bogota", weekday: "short", hour: "2-digit", minute: "2-digit" });
    out += `- **${time}** — ${item.title}${item.location ? ` _(${item.location})_` : ""}\n`;
  }
  return out.trim();
}

export function formatPlacesNearby(places: NearbyPlace[], type: string): string {
  if (places.length === 0) {
    return `📍 No se encontraron lugares tipo "${type}" cerca de esa ubicación.`;
  }
  let out = `📍 **Lugares cercanos (${type}): ${places.length}**\n\n`;
  for (const p of places) {
    const openLabel = p.openNow === true ? "Abierto ahora" : p.openNow === false ? "Cerrado ahora" : "";
    out += `- **${p.name}** ${p.rating ? `⭐${p.rating}` : ""} — ${p.address}${openLabel ? ` _(${openLabel})_` : ""}\n`;
  }
  return out.trim();
}

export function formatWeather(weather: CurrentWeather): string {
  return (
    `☀️ **Clima actual — ${weather.location}**\n\n` +
    `- Condición: **${weather.description}**\n` +
    `- Temperatura: **${weather.temperatureC.toFixed(1)}°C**\n` +
    `- Sensación térmica: **${weather.feelsLikeC.toFixed(1)}°C**` +
    (weather.humidityPercent != null ? `\n- Humedad: **${weather.humidityPercent}%**` : "")
  );
}

export function formatTasks(tasks: TaskItem[]): string {
  if (tasks.length === 0) {
    return "📝 **Tareas pendientes**: no hay tareas pendientes en Google Tasks.";
  }
  let out = `📝 **Tareas pendientes: ${tasks.length}**\n\n`;
  for (const t of tasks) {
    const dueLabel = t.due ? ` _(vence ${new Date(t.due).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })})_` : "";
    out += `- ${t.title}${dueLabel}\n`;
  }
  return out.trim();
}

export function formatSearchConsole(perf: SearchPerformance): string {
  let out =
    `🔍 **SEO & Tráfico Web — ${perf.siteUrl}** (últimos ${perf.periodDays} días)\n\n` +
    `- Clics: **${perf.totalClicks}**\n` +
    `- Impresiones: **${perf.totalImpressions}**\n` +
    `- CTR promedio: **${(perf.averageCtr * 100).toFixed(2)}%**\n` +
    `- Posición promedio: **${perf.averagePosition.toFixed(1)}**\n`;
  if (perf.topQueries.length > 0) {
    out += `\n**Palabras clave top:**\n`;
    for (const q of perf.topQueries.slice(0, 5)) {
      out += `- "${q.query}" — ${q.clicks} clics, ${q.impressions} impresiones, posición ${q.position.toFixed(1)}\n`;
    }
  }
  return out.trim();
}

export function formatYoutubeMetrics(metrics: ChannelMetrics): string {
  let out =
    `🎬 **Canal de YouTube: ${metrics.title}**\n\n` +
    `- Suscriptores: **${metrics.subscriberCount.toLocaleString("es-CO")}**\n` +
    `- Vistas totales: **${metrics.viewCount.toLocaleString("es-CO")}**\n` +
    `- Videos publicados: **${metrics.videoCount}**\n`;
  if (metrics.latestVideos.length > 0) {
    out += `\n**Últimos videos:**\n`;
    for (const v of metrics.latestVideos) {
      out += `- ${v.title} _(${new Date(v.publishedAt).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })})_\n`;
    }
  }
  return out.trim();
}

export function formatMapsRoute(route: RouteInfo, origin: string, destination: string): string {
  return (
    `🗺️ **Ruta: ${origin} → ${destination}**\n\n` +
    `- Distancia: **${route.distance}**\n` +
    `- Duración normal: **${route.duration}**\n` +
    `- Duración con tráfico actual: **${route.durationInTraffic}**\n` +
    `- Vía sugerida: ${route.summary || "N/D"}`
  );
}
