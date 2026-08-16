import { NextResponse } from "next/server";
import { getToolsStatus, getSupabaseHealth } from "@/lib/toolsBridge";

export async function GET() {
  const [status, ragOk] = await Promise.all([getToolsStatus(), getSupabaseHealth()]);
  return NextResponse.json({ ...status, rag: ragOk ? "ok" : "pending" }, { headers: { "Cache-Control": "no-store" } });
}
