import { NextRequest, NextResponse } from "next/server";
import { getMapsRoute } from "@/lib/toolsBridge";
import { formatMapsRoute } from "@/lib/toolsFormat";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.searchParams.get("origin");
  const destination = request.nextUrl.searchParams.get("destination");
  if (!origin || !destination) {
    return NextResponse.json({ error: "Faltan parámetros origin/destination" }, { status: 400 });
  }
  const result = await getMapsRoute(origin, destination);
  if (!result.ok || !result.route) {
    return NextResponse.json({ error: result.error || "No se pudo calcular la ruta" }, { status: 200 });
  }
  return NextResponse.json({
    text: formatMapsRoute(result.route, origin, destination),
    raw: result.route,
  });
}
