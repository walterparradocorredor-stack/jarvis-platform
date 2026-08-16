import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTaskRemote } from "@/lib/toolsBridge";
import { formatTasks } from "@/lib/toolsFormat";

export async function GET() {
  const result = await getTasks();
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "No se pudo consultar Tasks" }, { status: 200 });
  }
  return NextResponse.json({ text: formatTasks(result.tasks || []), raw: result.tasks });
}

export async function POST(request: NextRequest) {
  const { title, notes, due } = await request.json();
  if (!title) {
    return NextResponse.json({ error: "Falta el título de la tarea" }, { status: 400 });
  }
  const result = await createTaskRemote(title, notes, due);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "No se pudo crear la tarea" }, { status: 200 });
  }
  return NextResponse.json({ text: `📝 Tarea creada: **${result.task?.title}**`, raw: result.task });
}
