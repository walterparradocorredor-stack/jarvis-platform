export type LLMProvider = 'local' | 'groq' | 'openai' | 'gemini';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  content: string;
  timestamp: string;
  provider?: LLMProvider;
  latencyMs?: number;
  image?: string;
}

export interface SendMessagePayload {
  message: string;
  provider: LLMProvider;
  apiKey?: string;
  image?: string;
  history?: { role: string; content: string }[];
}

export async function sendJarvisMessage(payload: SendMessagePayload): Promise<{
  reply: string;
  latencyMs: number;
  provider: LLMProvider;
}> {
  const startTime = Date.now();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(data.error || "Error al comunicarse con JARVIS API");
    }

    return {
      reply: data.reply || "Sin respuesta del motor IA",
      latencyMs,
      provider: payload.provider,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error("Jarvis API error:", err);
    throw err;
  }
}
