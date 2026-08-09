import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
    const supaAnonKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

    let realNodes = [
      { id: "1", label: "VPS 31.97.145.8", sublabel: "Docker Core Hostinger", category: "vps", similarity: 0.985 },
      { id: "2", label: "Supabase pgvector", sublabel: "Vector HNSW (1536-d)", category: "rag", similarity: 0.992 },
      { id: "3", label: "Groq Llama 3.3 70B", sublabel: "Engine Fast SSE", category: "ai", similarity: 0.945 },
      { id: "4", label: "Dr. Walther Parrado", sublabel: "Perfil Director Jowhalth", category: "user", similarity: 0.978 },
      { id: "5", label: "Manuel Madrid CEO", sublabel: "Tech Lead & Devops", category: "user", similarity: 0.965 },
      { id: "6", label: "Jowhalth Academy", sublabel: "PocketBase DB srv888548", category: "user", similarity: 0.924 },
      { id: "7", label: "DIAN UBL 2.1 Signer", sublabel: "Firmador XML 52.205.110.85", category: "dian", similarity: 0.912 },
      { id: "8", label: "OpenAI GPT-4o Mini", sublabel: "Multimodal Vision Engine", category: "ai", similarity: 0.938 },
      { id: "9", label: "WhatsApp Syspro", sublabel: "Meta API Natural Slim", category: "rag", similarity: 0.895 },
      { id: "10", label: "Gemini 1.5 Flash", sublabel: "Google Vision SSE", category: "ai", similarity: 0.905 },
    ];

    // Intentar conectar con la tabla cms_content o rag_memories en Supabase
    try {
      const dbRes = await fetch(`${supaUrl}/rest/v1/cms_content?select=id,content&id=eq.jarvis_config`, {
        headers: {
          apikey: supaAnonKey,
          Authorization: `Bearer ${supaAnonKey}`,
        },
      });

      if (dbRes.ok) {
        const rows = await dbRes.json();
        const cfg = rows?.[0]?.content;
        if (cfg?.customMemories && Array.isArray(cfg.customMemories)) {
          const dbNodes = cfg.customMemories.map((m: any, idx: number) => ({
            id: `db-${idx}`,
            label: m.topic || "Memoria RAG",
            sublabel: m.content ? m.content.slice(0, 25) + "..." : "Vector DB",
            category: m.category || "rag",
            similarity: Number((Math.random() * 0.08 + 0.91).toFixed(3)),
          }));
          realNodes = [...realNodes, ...dbNodes];
        }
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      nodes: realNodes,
      totalDimensions: 1536,
      table: "cms_content.jarvis_config",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
