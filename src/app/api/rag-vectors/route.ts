import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

interface MemoryRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  embedding: number[] | null;
  created_at: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/jarvis_memory?select=id,role,content,embedding,created_at&order=created_at.desc&limit=16`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo consultar la memoria real" }, { status: 502 });
    }

    const rawRows: (Omit<MemoryRow, "embedding"> & { embedding: string | number[] | null })[] = await res.json();
    // PostgREST devuelve el tipo pgvector como string "[0.1,0.2,...]", no como array JSON nativo.
    const rows: MemoryRow[] = rawRows.map((r) => ({
      ...r,
      embedding: typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding,
    }));

    const nodes = rows.map((r) => ({
      id: r.id,
      label: r.content.length > 42 ? `${r.content.slice(0, 42)}...` : r.content,
      sublabel: `${r.role === "user" ? "Dr. Walther" : "Jarvis"} · ${new Date(r.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
      category: r.role === "user" ? "user" : "ai",
      similarity: 0,
    }));

    // Conexiones reales: para cada recuerdo, su vecino más cercano por
    // similitud de coseno entre embeddings reales (no inventadas).
    const edges: { source: string; target: string; weight: number }[] = [];
    const withEmbedding = rows.filter((r) => Array.isArray(r.embedding) && r.embedding.length > 0);

    for (let i = 0; i < withEmbedding.length; i++) {
      let bestJ = -1;
      let bestSim = 0;
      for (let j = 0; j < withEmbedding.length; j++) {
        if (i === j) continue;
        const sim = cosineSimilarity(withEmbedding[i].embedding as number[], withEmbedding[j].embedding as number[]);
        if (sim > bestSim) {
          bestSim = sim;
          bestJ = j;
        }
      }
      if (bestJ !== -1 && bestSim > 0.5) {
        edges.push({ source: withEmbedding[i].id, target: withEmbedding[bestJ].id, weight: bestSim });
        const node = nodes.find((n) => n.id === withEmbedding[i].id);
        if (node) node.similarity = Number(bestSim.toFixed(3));
      }
    }

    return NextResponse.json({
      success: true,
      nodes,
      edges,
      totalDimensions: 768,
      table: "public.jarvis_memory",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
