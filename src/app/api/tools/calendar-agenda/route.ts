import { NextRequest, NextResponse } from "next/server";
import { getCalendarAgenda } from "@/lib/toolsBridge";
import { formatCalendarAgenda } from "@/lib/toolsFormat";

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range") === "week" ? "week" : "today";
  const result = await getCalendarAgenda(range);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "No se pudo consultar Calendar" }, { status: 200 });
  }
  return NextResponse.json({
    text: formatCalendarAgenda(result.items || [], range),
    raw: result.items,
  });
}
