import { NextRequest, NextResponse } from "next/server";
import { getSearchConsolePerformance } from "@/lib/toolsBridge";
import { formatSearchConsole } from "@/lib/toolsFormat";

export async function GET(request: NextRequest) {
  const siteUrl = request.nextUrl.searchParams.get("siteUrl") || undefined;
  const days = Number(request.nextUrl.searchParams.get("days")) || 28;
  const result = await getSearchConsolePerformance(siteUrl, days);
  if (!result.ok || !result.performance) {
    return NextResponse.json({ error: result.error || "No se pudo consultar Search Console" }, { status: 200 });
  }
  return NextResponse.json({ text: formatSearchConsole(result.performance), raw: result.performance });
}
