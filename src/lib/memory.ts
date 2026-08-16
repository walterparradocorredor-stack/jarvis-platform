// Memoria persistente real de Jarvis: cada turno de conversación se guarda
// con su embedding en Supabase (pgvector), y antes de responder se recupera
// el contexto más relevante de TODO el historial (no solo la conversación
// actual) para que Jarvis recuerde cosas de sesiones anteriores.

const SUPABASE_URL = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";
const EMBEDDING_DIMS = 768;

export interface MemoryItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  similarity: number;
  created_at: string;
}

async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text.trim()) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: text.slice(0, 8000) }] },
          outputDimensionality: EMBEDDING_DIMS,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) && values.length === EMBEDDING_DIMS ? values : null;
  } catch {
    return null;
  }
}

/**
 * Guarda un turno de conversación (usuario o asistente) con su embedding.
 * Falla en silencio si algo sale mal — nunca debe romper el flujo de chat
 * por un problema de memoria.
 */
export async function saveMemory(conversationId: string, role: "user" | "assistant", content: string): Promise<void> {
  if (!content.trim()) return;
  try {
    const embedding = await embedText(content);
    await fetch(`${SUPABASE_URL}/rest/v1/jarvis_memory`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        role,
        content,
        embedding,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // memoria es best-effort, no debe tumbar el chat
  }
}

/**
 * Recupera los recuerdos más relevantes de TODO el historial (no solo la
 * conversación actual) para el mensaje dado, vía búsqueda por similitud
 * de coseno en pgvector. Devuelve [] si no hay memoria o algo falla.
 */
export async function retrieveRelevantMemory(query: string, matchCount = 5): Promise<MemoryItem[]> {
  try {
    const embedding = await embedText(query);
    if (!embedding) return [];

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_jarvis_memory`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query_embedding: embedding, match_count: matchCount }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Arma el bloque de contexto de memoria para inyectar en el system prompt.
 * Devuelve null si no hay recuerdos relevantes (umbral de similitud bajo).
 */
export function formatMemoryContext(items: MemoryItem[]): string | null {
  const relevant = items.filter((m) => m.similarity > 0.72);
  if (relevant.length === 0) return null;

  const lines = relevant
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((m) => `- (${m.role === "user" ? "Dr. Walther dijo" : "Jarvis respondió"}, ${new Date(m.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}): ${m.content.slice(0, 300)}`)
    .join("\n");

  return `[MEMORIA REAL DE CONVERSACIONES ANTERIORES — usa esto si es relevante para la pregunta actual, no lo repitas textual si no aplica]\n${lines}`;
}

/**
 * Envuelve un stream SSE estilo OpenAI (líneas "data: {...}") para que,
 * mientras reenvía cada chunk al cliente sin tocarlo, acumule el texto de
 * "choices[0].delta.content" y lo guarde en memoria cuando el stream termina.
 */
export function wrapStreamWithMemorySave(stream: ReadableStream<Uint8Array>, conversationId: string): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let full = "";

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        try {
          const text = decoder.decode(chunk, { stream: true });
          for (const line of text.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.replace(/^data:\s*/, "").trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) full += delta;
          }
        } catch {
          // no interrumpir el stream al cliente por un chunk que no se pudo parsear
        }
      },
      flush() {
        if (full.trim()) void saveMemory(conversationId, "assistant", full);
      },
    })
  );
}
