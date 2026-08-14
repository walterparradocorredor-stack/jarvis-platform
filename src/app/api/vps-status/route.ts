import { NextResponse } from "next/server";

/**
 * GET /api/vps-status
 * Consulta el estado real del VPS 31.97.145.8 llamando al Flask :5000
 * Si no está disponible, devuelve datos de health estimados + estado de la plataforma
 */
export async function GET() {
  const startTime = Date.now();
  const results: Record<string, any> = {};

  // 1. Ping al Flask :5000 (Engine IA Local)
  try {
    const flaskRes = await fetch("http://31.97.145.8:5000/health", {
      signal: AbortSignal.timeout(3000),
    });
    results.flask = {
      status: flaskRes.ok ? "UP" : "ERROR",
      latencyMs: Date.now() - startTime,
      statusCode: flaskRes.status,
    };
  } catch {
    results.flask = { status: "OFFLINE", latencyMs: null };
  }

  // 2. Ping al Supabase Kong :8000
  const supaStart = Date.now();
  try {
    const supaUrl = process.env.SUPABASE_INTERNAL_URL || "http://supabase-kong:8000";
    const supaRes = await fetch(`${supaUrl}/rest/v1/`, {
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NTU1MTI0LCJleHAiOjIxMDE5MTUxMjR9.gxsX0XhFm7uw7JjCJ5NB1g4K9Z8V_pRUkaLPHQo6Ps0",
      },
      signal: AbortSignal.timeout(3000),
    });
    results.supabase = {
      status: supaRes.ok || supaRes.status === 404 ? "UP" : "ERROR",
      latencyMs: Date.now() - supaStart,
    };
  } catch {
    results.supabase = { status: "OFFLINE", latencyMs: null };
  }

  // 3. Info de este proceso Node.js (Next.js)
  const memMB = process.memoryUsage().rss / 1024 / 1024;
  results.nextjs = {
    status: "UP",
    memoryMB: Math.round(memMB),
    uptime: Math.round(process.uptime()),
    nodeVersion: process.version,
  };

  // 4. Timestamp
  results.timestamp = new Date().toISOString();
  results.totalCheckMs = Date.now() - startTime;

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
