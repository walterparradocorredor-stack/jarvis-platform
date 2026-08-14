import { NextResponse } from "next/server";
import { getYoutubeChannelMetrics } from "@/lib/toolsBridge";
import { formatYoutubeMetrics } from "@/lib/toolsFormat";

export async function GET() {
  const result = await getYoutubeChannelMetrics();
  if (!result.ok || !result.metrics) {
    return NextResponse.json({ error: result.error || "No se pudo consultar YouTube" }, { status: 502 });
  }
  return NextResponse.json({ text: formatYoutubeMetrics(result.metrics), raw: result.metrics });
}
