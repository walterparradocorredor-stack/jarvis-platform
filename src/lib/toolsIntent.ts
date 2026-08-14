import {
  getGmailSummary,
  getCalendarAgenda,
  createCalendarEvent,
  getMapsRoute,
  getPlacesNearby,
  getWeatherCurrent,
  getTasks,
  createTaskRemote,
  getSearchConsolePerformance,
  getYoutubeChannelMetrics,
} from "./toolsBridge";
import {
  formatGmailSummary,
  formatCalendarAgenda,
  formatMapsRoute,
  formatPlacesNearby,
  formatWeather,
  formatTasks,
  formatSearchConsole,
  formatYoutubeMetrics,
} from "./toolsFormat";

const GMAIL_RE = /\b(correo|correos|gmail|bandeja de entrada|inbox|email|e-?mail)s?\b/i;
const CALENDAR_RE = /\b(agend\w*|calendario|cita|citas|reuni[oó]n|reuniones|calendar)\b/i;
// Crear cita: "crea/agenda/programa una cita/reunión con X en Y a las Z"
const CALENDAR_CREATE_RE = /\b(?:crea(?:r|me)?|agend(?:a|ar|ame)|programa(?:r|me)?)\s+(?:una\s+)?(?:cita|reuni[oó]n|evento)\b/i;
const MAPS_RE = /\b(ruta|rutas|tr[aá]fico|c[oó]mo llegar|mapa|distancia|cu[aá]nto me demoro|cu[aá]nto (me )?tardo)\b/i;
const ROUTE_PAIR_RE = /(?:de|desde)\s+(.+?)\s+(?:a|hasta|hacia)\s+(.+?)(?:[.?!]|$)/i;
const WEATHER_RE = /\b(clima|pron[oó]stico|temperatura|va a llover|lluvia|est[aá] soleado)\b/i;
const PLACES_RE = /\b(restaurante|restaurantes|hotel|hoteles|caf[eé]|lugares? cerca|cerca de m[ií]|d[oó]nde (como|almorzar|cenar))\b/i;
const TASKS_RE = /\b(tareas? pendientes?|to-?do|google tasks|lista de tareas|pendientes por hacer|mis tareas)\b/i;
// Crear tarea: "crea una tarea: X", "agregar tarea X", "recuérdame (que) X"
const TASK_CREATE_RE = /\b(?:crea(?:r)?|agregar?|añadir|anota(?:r)?)\s+(?:una\s+)?tareas?\b\s*(?:que dice|de)?\s*[:\-]?\s*(.+)/i;
const TASK_REMIND_RE = /\brecu[eé]rdame(?:\s+que)?\s+(.+)/i;
const SEO_RE = /\b(seo|tr[aá]fico web|search console|posicionamiento|clics? (de|en) (google|la web)|impresiones (de|en) google)\b/i;
const YOUTUBE_RE = /\b(youtube|canal de youtube|suscriptores|mis videos)\b/i;

// Sin geolocalización del navegador disponible en el server, se usa la sede
// de referencia del Dr. Walther (Bogotá) como origen por defecto para
// clima/lugares cercanos cuando el mensaje no da una ubicación explícita.
const DEFAULT_LAT = 4.711;
const DEFAULT_LNG = -74.0721;

interface ExtractedEvent {
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
}

/**
 * Usa Gemini para extraer título/fecha-hora/lugar de una petición de cita en
 * lenguaje natural ("crea una cita con Juan en la oficina mañana a las 3pm").
 * Parsear fechas relativas en español con regex es frágil; el LLM ya entiende
 * esto de forma robusta. Devuelve null si no logró extraer datos suficientes.
 */
async function extractEventDetails(message: string): Promise<ExtractedEvent | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const now = new Date();
  const nowStr = now.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" });

  const prompt = `Fecha y hora actual: ${nowStr} (America/Bogota, UTC-05:00).
Del siguiente mensaje, extrae los datos de una cita/reunión a crear en Google Calendar. Responde SOLO con un JSON válido, sin texto adicional, con esta forma exacta:
{"title": "...", "startTime": "ISO 8601 con offset -05:00", "endTime": "ISO 8601 con offset -05:00", "location": "..." o null, "description": "..." o null}
Si el mensaje no da una duración explícita, asume 1 hora. Si no hay suficiente información para saber cuándo es la cita (ningún indicio de fecha/hora), responde exactamente: {"error": "sin fecha"}

Mensaje: "${message}"`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (parsed.error || !parsed.title || !parsed.startTime || !parsed.endTime) return null;
    return parsed as ExtractedEvent;
  } catch {
    return null;
  }
}

/**
 * Detecta si el mensaje del usuario necesita datos reales de Gmail/Calendar/Maps
 * y devuelve un bloque de contexto para inyectar en el system prompt, con
 * instrucciones explícitas de usar SOLO esos datos reales (evita alucinación).
 * Devuelve null si el mensaje no requiere ninguna herramienta.
 */
export async function buildToolContext(message: string): Promise<string | null> {
  const blocks: string[] = [];

  if (GMAIL_RE.test(message)) {
    const result = await getGmailSummary();
    blocks.push(
      result.ok
        ? `[DATOS REALES DE GMAIL — usar exclusivamente esto, no inventar remitentes ni asuntos]\n${formatGmailSummary(result.items || [])}`
        : `[GMAIL NO DISPONIBLE] Error real al consultar la bandeja: "${result.error}". Informa este error tal cual, no inventes correos.`
    );
  }

  if (CALENDAR_CREATE_RE.test(message)) {
    const details = await extractEventDetails(message);
    if (!details) {
      blocks.push(
        `[NO SE PUDO CREAR LA CITA] No se logró extraer una fecha/hora clara del mensaje del usuario. Pídele que aclare el día y la hora de la cita — no inventes ni asumas una fecha.`
      );
    } else {
      const result = await createCalendarEvent(details);
      blocks.push(
        result.ok
          ? `[CITA CREADA REALMENTE EN GOOGLE CALENDAR: "${details.title}", ${details.startTime} a ${details.endTime}${details.location ? `, en ${details.location}` : ""}] Confirma al usuario que la cita quedó agendada, con esos datos exactos. No inventes detalles adicionales.`
          : `[NO SE PUDO CREAR LA CITA] Error real: "${result.error}". Informa este error tal cual — JAMÁS confirmes que la cita se creó si esto falló.`
      );
    }
  } else if (CALENDAR_RE.test(message)) {
    const range = /semana|pr[oó]ximos d[ií]as/i.test(message) ? "week" : "today";
    const result = await getCalendarAgenda(range);
    blocks.push(
      result.ok
        ? `[DATOS REALES DE CALENDAR — usar exclusivamente esto, no inventar citas]\n${formatCalendarAgenda(result.items || [], range)}`
        : `[CALENDAR NO DISPONIBLE] Error real al consultar la agenda: "${result.error}". Informa este error tal cual, no inventes citas.`
    );
  }

  if (MAPS_RE.test(message)) {
    const match = message.match(ROUTE_PAIR_RE);
    if (match) {
      const [, origin, destination] = match;
      const result = await getMapsRoute(origin.trim(), destination.trim());
      blocks.push(
        result.ok && result.route
          ? `[DATOS REALES DE GOOGLE MAPS — usar exclusivamente esto, no inventar distancias ni tiempos]\n${formatMapsRoute(result.route, origin.trim(), destination.trim())}`
          : `[MAPS NO DISPONIBLE] Error real al calcular la ruta: "${result.error}". Informa este error tal cual, no inventes datos de tráfico o distancia.`
      );
    } else {
      blocks.push(
        `[MAPS: falta origen/destino] El usuario pidió información de ruta o tráfico pero no especificó claramente origen y destino en su mensaje. Pídele que aclare "desde [origen] hasta [destino]" — no inventes una ruta ni asumas ubicaciones.`
      );
    }
  }

  if (WEATHER_RE.test(message)) {
    const result = await getWeatherCurrent(DEFAULT_LAT, DEFAULT_LNG);
    blocks.push(
      result.ok && result.weather
        ? `[DATOS REALES DE CLIMA (Bogotá, sede de referencia) — usar exclusivamente esto]\n${formatWeather(result.weather)}`
        : `[CLIMA NO DISPONIBLE] Error real al consultar el clima: "${result.error}". Informa este error tal cual, no inventes temperatura ni condiciones.`
    );
  }

  if (PLACES_RE.test(message)) {
    const type = /hotel/i.test(message) ? "lodging" : /caf[eé]/i.test(message) ? "cafe" : "restaurant";
    const result = await getPlacesNearby(DEFAULT_LAT, DEFAULT_LNG, type);
    blocks.push(
      result.ok
        ? `[DATOS REALES DE LUGARES CERCANOS (Bogotá, sede de referencia) — usar exclusivamente esto, no inventar nombres ni direcciones]\n${formatPlacesNearby(result.places || [], type)}`
        : `[LUGARES NO DISPONIBLE] Error real al buscar lugares cercanos: "${result.error}". Informa este error tal cual, no inventes lugares.`
    );
  }

  const taskCreateMatch = message.match(TASK_CREATE_RE) || message.match(TASK_REMIND_RE);
  if (taskCreateMatch && taskCreateMatch[1]) {
    const title = taskCreateMatch[1].trim().replace(/[.?!]+$/, "");
    const result = await createTaskRemote(title);
    blocks.push(
      result.ok && result.task
        ? `[TAREA CREADA REALMENTE EN GOOGLE TASKS: "${result.task.title}"] Confirma al usuario que la tarea quedó creada. No inventes fecha límite, prioridad ni detalles que el usuario no haya dado explícitamente.`
        : `[NO SE PUDO CREAR LA TAREA] Error real: "${result.error}". Informa este error tal cual — JAMÁS confirmes que la tarea se creó si esto falló.`
    );
  } else if (TASKS_RE.test(message)) {
    const result = await getTasks();
    blocks.push(
      result.ok
        ? `[DATOS REALES DE GOOGLE TASKS — usar exclusivamente esto, no inventar tareas]\n${formatTasks(result.tasks || [])}`
        : `[TASKS NO DISPONIBLE] Error real al consultar las tareas: "${result.error}". Informa este error tal cual, no inventes tareas.`
    );
  }

  if (SEO_RE.test(message)) {
    const result = await getSearchConsolePerformance();
    blocks.push(
      result.ok && result.performance
        ? `[DATOS REALES DE SEARCH CONSOLE — usar exclusivamente esto, no inventar cifras de tráfico]\n${formatSearchConsole(result.performance)}`
        : `[SEARCH CONSOLE NO DISPONIBLE] Error real al consultar el tráfico SEO: "${result.error}". Informa este error tal cual, no inventes clics ni impresiones.`
    );
  }

  if (YOUTUBE_RE.test(message)) {
    const result = await getYoutubeChannelMetrics();
    blocks.push(
      result.ok && result.metrics
        ? `[DATOS REALES DE YOUTUBE — usar exclusivamente esto, no inventar suscriptores ni videos]\n${formatYoutubeMetrics(result.metrics)}`
        : `[YOUTUBE NO DISPONIBLE] Error real al consultar el canal: "${result.error}". Informa este error tal cual, no inventes métricas.`
    );
  }

  return blocks.length > 0 ? blocks.join("\n\n") : null;
}
