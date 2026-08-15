import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://www.waltherparrado.com/supabase-api";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

/**
 * Verifica que la petición traiga un access token de sesión Supabase válido
 * (Authorization: Bearer <token>). Protege los endpoints del motor de IA para
 * que nadie sin sesión iniciada pueda consumir el chat privado de JARVIS.
 * Devuelve un NextResponse 401 si la verificación falla, o null si es válida.
 */
export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json(
      { error: "No autenticado. Inicia sesión para usar el chat privado de JARVIS." },
      { status: 401 }
    );
  }

  const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabaseServer.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json(
      { error: "Sesión inválida o expirada. Vuelve a iniciar sesión." },
      { status: 401 }
    );
  }

  return null;
}
