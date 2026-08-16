import {
  getGmailSummary,
  searchGmail,
  trashGmailMessage,
  archiveGmailMessage,
  sendGmailMessage,
  resolveGmailContact,
  getCalendarAgenda,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
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

// OJO acentos: el imperativo voseo ("borrá", "cancelá", "archivá") termina
// en vocal con tilde, sin "r" — muy natural al hablar/dictar por voz. Todas
// las regex de verbos de esta sección usan [aá]/[eé] etc. para cubrir tanto
// "borra"/"borrar" como "borrá" — un solo "borra(?:r)?" se comía el sin-tilde
// nada más y dejaba pasar comandos de voz reales sin detectar.
const GMAIL_RE = /\b(correo|correos|gmail|bandeja de entrada|inbox|email|e-?mail)s?\b/i;
// Resumir/leer UN correo puntual: "resumime/leeme/qué dice el correo de X"
const GMAIL_READ_ONE_RE = /\b(resum[ií](?:me|r)|lee(?:me)?|qu[eé] dice)\b.*\b(correo|email|e-?mail)\b/i;
// Borrar un correo: "borra/borrá/elimina/eliminá el correo de X"
const GMAIL_DELETE_RE = /\b(?:borr[aá](?:r)?|elimin[aá](?:r)?)\s+(?:el\s+|ese\s+|ese\s+mismo\s+|ese\s+ultimo\s+|el\s+ultimo\s+)*(?:correo|email|e-?mail)\b/i;
// Archivar/organizar un correo: "archiva/archivá/organiza/organizá el correo de X"
const GMAIL_ARCHIVE_RE = /\b(?:archiv[aá](?:r)?|organiz[aá](?:r)?|guard[aá](?:r)?)\s+(?:el\s+|ese\s+)*(?:correo|email|e-?mail)\b/i;
// Enviar un correo nuevo: "mandale/enviale/escribile un correo a X diciendo Y"
const GMAIL_SEND_RE = /\b(?:m[aá]nda(?:le|selo)?|env[ií][aá](?:le|selo)?|escr[ií]be(?:le|selo)?|escrib[ií](?:le|selo)?|redact[aá](?:r|me)?)\s+(?:un\s+|el\s+)?(?:correo|email|e-?mail)\b/i;
const CALENDAR_RE = /\b(agend\w*|calendario|cita|citas|reuni[oó]n|reuniones|calendar)\b/i;
// Crear cita: "crea/creá/agenda/agendá/programa/programá una cita/reunión con X en Y a las Z"
const CALENDAR_CREATE_RE = /\b(?:cre[aá](?:r|me)?|agend(?:[aá]|ar|ame)|program[aá](?:r|me)?)\s+(?:una\s+)?(?:cita|reuni[oó]n|evento)\b/i;
// Cancelar/borrar cita: "cancela/cancelá/borra/borrá/elimina/eliminá mi cita/reunión con X"
const CALENDAR_DELETE_RE = /\b(?:cancel[aá](?:r)?|borr[aá](?:r)?|elimin[aá](?:r)?|quit[aá](?:r)?)\s+(?:la\s+|el\s+|los\s+|las\s+|mi\s+|mis\s+|un\s+|una\s+|ese\s+|esa\s+|esta\s+|este\s+)*(?:cita|reuni[oó]n|evento)/i;
// Mover/reprogramar cita: "cambia/cambiá/mueve/pasa/pasá/reprograma/reprogramá mi cita con X para las Y"
const CALENDAR_UPDATE_RE = /\b(?:cambi[aá](?:r)?|mueve(?:me|la|lo)?|mov[eé](?:r|me)?|pas[aá](?:r)?|reprogram[aá](?:r)?|reagend[aá](?:r)?|actualiz[aá](?:r)?)\s+(?:la\s+|el\s+|los\s+|las\s+|mi\s+|mis\s+|un\s+|una\s+|ese\s+|esa\s+|esta\s+|este\s+)*(?:cita|reuni[oó]n|evento|hora)/i;
const MAPS_RE = /\b(ruta|rutas|tr[aá]fico|c[oó]mo llegar|mapa|distancia|cu[aá]nto me demoro|cu[aá]nto (me )?tardo)\b/i;
const ROUTE_PAIR_RE = /(?:de|desde)\s+(.+?)\s+(?:a|hasta|hacia)\s+(.+?)(?:[.?!]|$)/i;
const WEATHER_RE = /\b(clima|pron[oó]stico|temperatura|va a llover|lluvia|est[aá] soleado)\b/i;
const PLACES_RE = /\b(restaurante|restaurantes|hotel|hoteles|caf[eé]|lugares? cerca|cerca de m[ií]|d[oó]nde (como|almorzar|cenar))\b/i;
const TASKS_RE = /\b(tareas? pendientes?|to-?do|google tasks|lista de tareas|pendientes por hacer|mis tareas)\b/i;
// Crear tarea: "crea una tarea: X", "agregar tarea X", "recuérdame (que) X"
const TASK_CREATE_RE = /\b(?:cre[aá](?:r)?|agreg[aá](?:r)?|añad(?:ir|í)|anot[aá](?:r)?)\s+(?:una\s+)?tareas?\b\s*(?:que dice|de)?\s*[:\-]?\s*(.+)/i;
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

interface EventMatch {
  status: "found" | "ambiguous" | "not_found";
  eventId?: string;
  title?: string;
  candidates?: { title: string; when: string }[];
}

/**
 * Usa Gemini para identificar A CUÁL cita real (de la agenda de los próximos
 * 7 días) se refiere el usuario cuando pide cancelarla. Nunca borra a ciegas:
 * si hay más de un evento que podría ser ("Cita con Manuel" duplicada, por
 * ejemplo), devuelve "ambiguous" para que Jarvis pregunte cuál en vez de
 * adivinar y borrar la equivocada.
 */
async function matchEventToDelete(message: string): Promise<EventMatch | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const agenda = await getCalendarAgenda("week");
  if (!agenda.ok || !agenda.items || agenda.items.length === 0) {
    return { status: "not_found" };
  }

  const eventList = agenda.items
    .map((e) => `- id="${e.id}" | "${e.title}" | ${e.start} a ${e.end}${e.location ? ` | ${e.location}` : ""}`)
    .join("\n");

  const prompt = `Estos son los eventos reales de la agenda de los próximos 7 días:
${eventList}

El usuario escribió: "${message}"

¿A cuál de estos eventos se refiere para cancelarlo/borrarlo? Responde SOLO con un JSON válido, sin texto adicional:
- Si hay EXACTAMENTE un evento que coincide claramente: {"status": "found", "eventId": "...", "title": "..."}
- Si hay dos o más eventos que podrían ser (ej. título repetido, referencia ambigua): {"status": "ambiguous", "candidates": [{"title": "...", "when": "..."}, ...]}
- Si ningún evento coincide con lo que pide: {"status": "not_found"}`;

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
    return JSON.parse(text) as EventMatch;
  } catch {
    return null;
  }
}

interface EventReschedule {
  status: "found" | "ambiguous" | "not_found";
  eventId?: string;
  title?: string;
  newStartTime?: string;
  newEndTime?: string;
  candidates?: { title: string; when: string }[];
}

/**
 * Igual que matchEventToDelete, pero además extrae la nueva fecha/hora que
 * pide el usuario ("cámbiala para las 5pm", "muévela al viernes"). Nunca
 * mueve una cita si hay ambigüedad sobre cuál — pregunta primero.
 */
async function matchEventToReschedule(message: string): Promise<EventReschedule | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const agenda = await getCalendarAgenda("week");
  if (!agenda.ok || !agenda.items || agenda.items.length === 0) {
    return { status: "not_found" };
  }

  const now = new Date();
  const nowStr = now.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" });
  const eventList = agenda.items
    .map((e) => `- id="${e.id}" | "${e.title}" | ${e.start} a ${e.end}${e.location ? ` | ${e.location}` : ""}`)
    .join("\n");

  const prompt = `Fecha y hora actual: ${nowStr} (America/Bogota, UTC-05:00).
Estos son los eventos reales de la agenda de los próximos 7 días:
${eventList}

El usuario escribió: "${message}"

Quiere mover/cambiar la hora de uno de estos eventos. Responde SOLO con un JSON válido, sin texto adicional:
- Si hay EXACTAMENTE un evento que coincide Y se puede determinar la nueva fecha/hora con claridad: {"status": "found", "eventId": "...", "title": "...", "newStartTime": "ISO 8601 con offset -05:00", "newEndTime": "ISO 8601 con offset -05:00 (misma duración que el evento original si no se especifica otra)"}
- Si hay dos o más eventos que podrían ser: {"status": "ambiguous", "candidates": [{"title": "...", "when": "..."}, ...]}
- Si no hay ningún evento que coincida, o no se puede determinar con claridad la nueva fecha/hora: {"status": "not_found"}`;

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
    return JSON.parse(text) as EventReschedule;
  } catch {
    return null;
  }
}

// Quita las palabras de comando/relleno del mensaje para quedarse con el
// término de búsqueda real (ej. "resumime el correo de Hostinger" -> "Hostinger").
// Heurístico simple a propósito: la búsqueda de Gmail (q=) ya hace full-text
// sobre remitente/asunto/cuerpo, no hace falta una query perfecta.
function extractGmailQuery(message: string): string {
  return message
    .replace(
      /\b(resum[ií](?:me|r)|lee(?:me)?|qu[eé] dice|borra(?:r)?|elimina(?:r)?|archiva(?:r)?|organiza(?:r)?|guarda(?:r)?)\b/gi,
      " "
    )
    .replace(/\b(el|los|un|una|mi|mis|ese|esa|este|esta|correo|correos|de|del|email|e-?mail|gmail)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface GmailMatch {
  status: "found" | "ambiguous" | "not_found";
  message?: { id: string; from: string; subject: string; date: string; body: string };
  candidates?: { id: string; from: string; subject: string }[];
}

/**
 * Busca en Gmail real a partir del mensaje del usuario. Nunca actúa a ciegas
 * sobre un correo: si la búsqueda da más de un resultado, devuelve "ambiguous"
 * para que Jarvis pregunte cuál en vez de adivinar (mismo criterio que
 * matchEventToDelete para Calendar).
 */
async function matchGmailMessage(message: string): Promise<GmailMatch> {
  const query = extractGmailQuery(message);
  if (!query) return { status: "not_found" };

  const result = await searchGmail(query);
  if (!result.ok || !result.items || result.items.length === 0) {
    return { status: "not_found" };
  }
  if (result.items.length === 1) {
    return { status: "found", message: result.items[0] };
  }
  return {
    status: "ambiguous",
    candidates: result.items.map((m) => ({ id: m.id, from: m.from, subject: m.subject })),
  };
}

interface DraftEmail {
  to: string; // dirección de correo, o un nombre si no se pudo resolver
  toIsEmail: boolean;
  subject: string;
  body: string;
}

/**
 * Extrae destinatario/asunto/cuerpo de un pedido en lenguaje natural
 * ("mandale un correo a Juan diciendo que llego tarde a la reunión") vía
 * Gemini. Redactar un buen asunto+cuerpo a partir de una frase dictada es
 * más robusto con el LLM que con regex — mismo criterio que ya se usa para
 * extraer fecha/hora de una cita nueva.
 */
async function extractDraftEmail(message: string): Promise<DraftEmail | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Del siguiente mensaje, extraé los datos para redactar y enviar un correo real. Respondé SOLO con un JSON válido, sin texto adicional:
{"to": "dirección de correo o nombre de la persona tal como la mencionó el usuario", "subject": "asunto corto y claro", "body": "cuerpo del correo redactado en tono profesional pero natural, en español, basado en lo que pidió el usuario — no inventes contenido que el usuario no haya dado a entender"}
Si no hay suficiente información para saber a quién o qué decir, respondé exactamente: {"error": "sin datos suficientes"}

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
    if (parsed.error || !parsed.to || !parsed.subject || !parsed.body) return null;
    const toIsEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(parsed.to);
    return { to: parsed.to, toIsEmail, subject: parsed.subject, body: parsed.body };
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

  if (GMAIL_SEND_RE.test(message)) {
    const draft = await extractDraftEmail(message);
    if (!draft) {
      blocks.push(
        `[NO SE PUDO REDACTAR EL CORREO] No hay suficiente información (destinatario, asunto o contenido) para armar el correo. Pregúntale al usuario a quién, sobre qué y qué quiere decir — NO inventes que lo enviaste.`
      );
    } else {
      let toEmail = draft.to;
      if (!draft.toIsEmail) {
        const resolved = await resolveGmailContact(draft.to);
        if (!resolved.ok || !resolved.email) {
          blocks.push(
            `[NO SE PUDO RESOLVER EL DESTINATARIO] No se encontró una dirección de correo real para "${draft.to}" en el historial de Gmail. Pregúntale al usuario la dirección exacta — JAMÁS inventes un correo electrónico.`
          );
          toEmail = "";
        } else {
          toEmail = resolved.email;
        }
      }
      if (toEmail) {
        const result = await sendGmailMessage(toEmail, draft.subject, draft.body);
        blocks.push(
          result.ok
            ? `[CORREO ENVIADO REALMENTE POR GMAIL a ${toEmail}] Asunto: "${draft.subject}". Confirma al usuario que se envió, con el destinatario y asunto exactos.`
            : `[NO SE PUDO ENVIAR EL CORREO] Error real: "${result.error}". Informa este error tal cual — JAMÁS confirmes el envío si esto falló.`
        );
      }
    }
  } else if (GMAIL_DELETE_RE.test(message) || GMAIL_ARCHIVE_RE.test(message)) {
    const isDelete = GMAIL_DELETE_RE.test(message);
    const match = await matchGmailMessage(message);
    if (match.status === "not_found") {
      blocks.push(
        `[NO SE ENCONTRÓ EL CORREO] No se encontró ningún correo real que coincida con lo que pide el usuario. Pregúntale de quién es o el asunto — no inventes que lo ${isDelete ? "borraste" : "archivaste"}.`
      );
    } else if (match.status === "ambiguous") {
      const list = (match.candidates || []).map((c) => `- "${c.subject}" (de ${c.from})`).join("\n");
      blocks.push(
        `[VARIOS CORREOS COINCIDEN, SE NECESITA ACLARACIÓN]\n${list}\nHay más de un correo real que podría ser. Pregúntale al usuario cuál exactamente (por remitente o asunto) — NO ${isDelete ? "borres" : "archives"} ninguno todavía, no asumas cuál.`
      );
    } else {
      const msg = match.message!;
      const result = isDelete ? await trashGmailMessage(msg.id) : await archiveGmailMessage(msg.id);
      blocks.push(
        result.ok
          ? `[CORREO ${isDelete ? "BORRADO" : "ARCHIVADO"} REALMENTE EN GMAIL: "${msg.subject}" de ${msg.from}] Confirma al usuario con el asunto exacto.`
          : `[NO SE PUDO ${isDelete ? "BORRAR" : "ARCHIVAR"} EL CORREO] Error real: "${result.error}". Informa este error tal cual — JAMÁS confirmes la acción si esto falló.`
      );
    }
  } else if (GMAIL_READ_ONE_RE.test(message)) {
    const match = await matchGmailMessage(message);
    if (match.status === "not_found") {
      blocks.push(
        `[NO SE ENCONTRÓ EL CORREO] No se encontró ningún correo real que coincida. Pregúntale al usuario de quién es o el asunto exacto — no inventes contenido de un correo que no existe.`
      );
    } else if (match.status === "ambiguous") {
      const list = (match.candidates || []).map((c) => `- "${c.subject}" (de ${c.from})`).join("\n");
      blocks.push(
        `[VARIOS CORREOS COINCIDEN, SE NECESITA ACLARACIÓN]\n${list}\nPregúntale al usuario cuál de estos quiere que resuma — no inventes cuál ni mezcles contenido de varios.`
      );
    } else {
      const msg = match.message!;
      blocks.push(
        `[CONTENIDO REAL DEL CORREO — usar exclusivamente esto para el resumen, no inventar nada que no esté acá]\nDe: ${msg.from}\nAsunto: ${msg.subject}\nFecha: ${msg.date}\nCuerpo:\n${msg.body}`
      );
    }
  } else if (GMAIL_RE.test(message)) {
    const result = await getGmailSummary();
    blocks.push(
      result.ok
        ? `[DATOS REALES DE GMAIL — usar exclusivamente esto, no inventar remitentes ni asuntos]\n${formatGmailSummary(result.items || [])}`
        : `[GMAIL NO DISPONIBLE] Error real al consultar la bandeja: "${result.error}". Informa este error tal cual, no inventes correos.`
    );
  }

  if (CALENDAR_UPDATE_RE.test(message)) {
    const resched = await matchEventToReschedule(message);
    if (!resched || resched.status === "not_found") {
      blocks.push(
        `[NO SE PUDO MOVER LA CITA] No se encontró con claridad cuál cita mover o para cuándo. Pregúntale al usuario cuál cita exactamente y a qué fecha/hora nueva — no inventes que la moviste.`
      );
    } else if (resched.status === "ambiguous") {
      const list = (resched.candidates || []).map((c) => `- "${c.title}" (${c.when})`).join("\n");
      blocks.push(
        `[VARIAS CITAS COINCIDEN, SE NECESITA ACLARACIÓN]\n${list}\nHay más de una cita real que podría ser la que el usuario quiere mover. Pregúntale cuál de estas exactamente — NO muevas ninguna todavía, no asumas cuál.`
      );
    } else {
      const result = await updateCalendarEvent(resched.eventId!, {
        startTime: resched.newStartTime,
        endTime: resched.newEndTime,
      });
      blocks.push(
        result.ok
          ? `[CITA MOVIDA REALMENTE EN GOOGLE CALENDAR: "${resched.title}" ahora es ${resched.newStartTime} a ${resched.newEndTime}] Confirma al usuario la nueva fecha/hora exacta.`
          : `[NO SE PUDO MOVER LA CITA] Error real: "${result.error}". Informa este error tal cual — JAMÁS confirmes que la cita se movió si esto falló.`
      );
    }
  } else if (CALENDAR_DELETE_RE.test(message)) {
    const match = await matchEventToDelete(message);
    if (!match || match.status === "not_found") {
      blocks.push(
        `[NO SE ENCONTRÓ LA CITA A BORRAR] No se encontró ningún evento real en la agenda que coincida con lo que pide el usuario. Dile esto con honestidad y pregúntale el nombre/fecha exacta — no inventes que borraste algo.`
      );
    } else if (match.status === "ambiguous") {
      const list = (match.candidates || []).map((c) => `- "${c.title}" (${c.when})`).join("\n");
      blocks.push(
        `[VARIAS CITAS COINCIDEN, SE NECESITA ACLARACIÓN]\n${list}\nHay más de una cita real que podría ser la que el usuario quiere borrar. Pregúntale cuál de estas exactamente (por fecha/hora) — NO borres ninguna todavía, no asumas cuál.`
      );
    } else {
      const result = await deleteCalendarEvent(match.eventId!);
      blocks.push(
        result.ok
          ? `[CITA BORRADA REALMENTE DE GOOGLE CALENDAR: "${match.title}"] Confirma al usuario que esa cita fue eliminada de verdad.`
          : `[NO SE PUDO BORRAR LA CITA] Error real: "${result.error}". Informa este error tal cual — JAMÁS confirmes que la cita se borró si esto falló.`
      );
    }
  } else if (CALENDAR_CREATE_RE.test(message)) {
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
