import { NextRequest, NextResponse } from "next/server";
import { getWeatherCurrent } from "@/lib/toolsBridge";
import { formatWeather } from "@/lib/toolsFormat";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "Faltan parámetros lat/lng" }, { status: 400 });
  }
  const result = await getWeatherCurrent(Number(lat), Number(lng));
  if (!result.ok || !result.weather) {
    return NextResponse.json({ error: result.error || "No se pudo consultar el clima" }, { status: 200 });
  }
  return NextResponse.json({ text: formatWeather(result.weather), raw: result.weather });
}
