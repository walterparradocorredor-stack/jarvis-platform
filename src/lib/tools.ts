// Herramientas reales que JARVIS puede invocar vía function calling (Groq,
// formato compatible OpenAI). Cada una pega contra tools-bridge, que tiene
// las credenciales — acá solo se define el contrato que ve el modelo.

export const JARVIS_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_directions",
      description:
        "Obtiene distancia, duración y tráfico EN VIVO real entre dos lugares usando Google Maps. Úsala siempre que el usuario pregunte por rutas, tiempos de viaje o tráfico — nunca inventes esos datos.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Dirección o lugar de origen" },
          destination: { type: "string", description: "Dirección o lugar de destino" },
        },
        required: ["origin", "destination"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description:
        "Crea un evento REAL en el Google Calendar del Dr. Walther Parrado (efecto inmediato, no es una simulación). Úsala cuando el usuario pida agendar, programar o crear una cita/reunión/evento. Calculá startDateTime/endDateTime en ISO 8601 con el offset de America/Bogota (-05:00) usando la fecha/hora actual del sistema como referencia para resolver expresiones relativas ('el jueves', 'mañana').",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Título del evento" },
          description: { type: "string", description: "Descripción opcional" },
          location: { type: "string", description: "Ubicación opcional" },
          startDateTime: {
            type: "string",
            description: "Fecha/hora de inicio en ISO 8601 con offset, ej: 2026-08-20T15:00:00-05:00",
          },
          endDateTime: {
            type: "string",
            description: "Fecha/hora de fin en ISO 8601 con offset. Si el usuario no da duración, asumí 1 hora.",
          },
        },
        required: ["summary", "startDateTime", "endDateTime"],
      },
    },
  },
] as const;

export async function executeJarvisTool(name: string, args: Record<string, any>): Promise<string> {
  const bridgeUrl = process.env.TOOLS_BRIDGE_URL || "http://tools-bridge:4100";
  try {
    if (name === "get_directions") {
      const params = new URLSearchParams({ origin: args.origin, destination: args.destination });
      const res = await fetch(`${bridgeUrl}/api/tools/directions?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      return JSON.stringify(data);
    }
    if (name === "create_calendar_event") {
      const res = await fetch(`${bridgeUrl}/api/tools/create-calendar-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      return JSON.stringify(data);
    }
    return JSON.stringify({ ok: false, error: `Herramienta desconocida: ${name}` });
  } catch (err: any) {
    return JSON.stringify({ ok: false, error: `Error al ejecutar ${name}: ${err.message}` });
  }
}
