import { NextResponse } from "next/server";
import { getGmailSummary, getCalendarAgenda } from "@/lib/toolsBridge";
import { formatGmailSummary, formatCalendarAgenda } from "@/lib/toolsFormat";

export async function GET() {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [gmail, calendar] = await Promise.all([getGmailSummary(), getCalendarAgenda("today")]);

  const gmailBlock = gmail.ok
    ? formatGmailSummary(gmail.items || [])
    : `📧 **Correos**: no se pudo consultar Gmail ahora mismo (${gmail.error}).`;

  const calendarBlock = calendar.ok
    ? formatCalendarAgenda(calendar.items || [], "today")
    : `📅 **Agenda**: no se pudo consultar Calendar ahora mismo (${calendar.error}).`;

  const text =
    `📰 **Daily Briefing Ejecutivo — ${fecha}**\n\n` +
    `${gmailBlock}\n\n---\n\n${calendarBlock}\n\n---\n\n` +
    `🖥️ Infraestructura VPS 31.97.145.8 operativa. Motor local: Qwen 2.5 14B (Ollama). Motor rápido: Groq Llama 3.3 70B.`;

  return NextResponse.json({ text });
}
