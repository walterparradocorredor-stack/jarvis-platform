import { NextRequest, NextResponse } from "next/server";
import { getPlacesNearby } from "@/lib/toolsBridge";
import { formatPlacesNearby } from "@/lib/toolsFormat";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const type = request.nextUrl.searchParams.get("type") || "restaurant";
  if (!lat || !lng) {
    return NextResponse.json({ error: "Faltan parámetros lat/lng" }, { status: 400 });
  }
  const result = await getPlacesNearby(Number(lat), Number(lng), type);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "No se pudo consultar Places" }, { status: 200 });
  }
  return NextResponse.json({ text: formatPlacesNearby(result.places || [], type), raw: result.places });
}
