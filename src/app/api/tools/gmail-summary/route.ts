import { NextResponse } from "next/server";
import { getGmailSummary } from "@/lib/toolsBridge";
import { formatGmailSummary } from "@/lib/toolsFormat";

export async function GET() {
  const result = await getGmailSummary();
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "No se pudo consultar Gmail" }, { status: 200 });
  }
  return NextResponse.json({
    text: formatGmailSummary(result.items || []),
    raw: result.items,
  });
}
