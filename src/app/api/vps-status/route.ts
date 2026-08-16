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
    // La raíz "/rest/v1/" cae en la ruta "openapi" de Kong (ACL admin-only,
    // 403 para la key anon aunque Supabase esté sano) — hay que pedir una
    // tabla real para caer en la ruta con ACL admin+anon.
    const supaAnonKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";
    const supaRes = await fetch(`${supaUrl}/rest/v1/cms_content?select=id&limit=1`, {
      headers: { apikey: supaAnonKey, Authorization: `Bearer ${supaAnonKey}` },
      signal: AbortSignal.timeout(3000),
    });
    results.supabase = {
      status: supaRes.ok ? "UP" : "ERROR",
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
