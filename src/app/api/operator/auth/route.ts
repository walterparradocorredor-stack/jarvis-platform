import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// El PIN de /operator vivía hardcodeado en el bundle del cliente — cualquiera
// podía leerlo abriendo el código fuente en el navegador. Se valida acá,
// server-side, contra OPERATOR_PIN (nunca enviado al cliente).
export async function POST(req: NextRequest) {
  const realPin = process.env.OPERATOR_PIN;
  if (!realPin) {
    return NextResponse.json({ ok: false, error: "OPERATOR_PIN no configurado en el servidor" }, { status: 500 });
  }
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const input = String(pin || "");

  const a = Buffer.from(input.padEnd(realPin.length, "\0"));
  const b = Buffer.from(realPin.padEnd(input.length, "\0"));
  const match = a.length === b.length && timingSafeEqual(a, b) && input === realPin;

  if (!match) {
    return NextResponse.json({ ok: false, error: "Código de acceso incorrecto" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
