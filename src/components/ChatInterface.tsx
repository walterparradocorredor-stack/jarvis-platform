"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RefreshCw, Cpu, Check, Copy } from "lucide-react";
import { ChatMessage, LLMProvider, sendJarvisMessage } from "@/lib/jarvisApi";

interface ChatInterfaceProps {
  currentProvider?: LLMProvider;
  activeApiKey?: string;
  isOperatorView?: boolean;
}

export default function ChatInterface({
  currentProvider = "local",
  activeApiKey = "",
  isOperatorView = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "jarvis",
      content:
        "¡Hola! Soy **JARVIS**, la Inteligencia Artificial Corporativa de **JyM Tech Solutions**. ¿En qué puedo colaborarle el día de hoy?",
      timestamp: "08:00 AM",
      provider: currentProvider,
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Historial para enviar a la API
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await sendJarvisMessage({
        message: userText,
        provider: currentProvider,
        apiKey: activeApiKey,
        history,
      });

      const jarvisMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "jarvis",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: res.provider,
        latencyMs: res.latencyMs,
      };

      setMessages((prev) => [...prev, jarvisMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "jarvis",
        content: `⚠️ **[Error de Conexión]** No se pudo obtener respuesta del servidor. Detalle: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] relative overflow-hidden">
      {/* Glow Orbs de fondo */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-cyan-600/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none" />

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto relative z-10">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 md:gap-4 animate-fadeIn ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.sender === "user"
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20"
                  : "bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 border border-cyan-500/30 text-cyan-400 shadow-cyan-500/10"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-5 h-5" />
              ) : (
                <Cpu className="w-5 h-5 animate-pulse" />
              )}
            </div>

            {/* Bubble Contenedor */}
            <div
              className={`group relative max-w-[85%] md:max-w-[78%] rounded-2xl p-4 border transition-all ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-cyan-500/30 text-slate-100 rounded-tr-none shadow-lg shadow-cyan-950/20"
                  : "bg-slate-900/80 backdrop-blur-md border-slate-800 text-slate-200 rounded-tl-none hover:border-slate-700"
              }`}
            >
              {/* Header de mensaje */}
              <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/5">
                <span className="text-xs font-bold tracking-wider text-slate-300">
                  {msg.sender === "user" ? "Tú (Cliente)" : "JARVIS AI Core"}
                </span>
                <div className="flex items-center gap-2">
                  {msg.latencyMs && (
                    <span className="text-[10px] font-mono text-cyan-400/80">
                      ⚡ {msg.latencyMs}ms
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
              </div>

              {/* Contenido del texto */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-200">
                {msg.content}
              </div>

              {/* Botón copiar */}
              <button
                onClick={() => handleCopy(msg.content, msg.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
                title="Copiar texto"
              >
                {copiedId === msg.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}

        {/* Indicador de escribiendo */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Cpu className="w-5 h-5 animate-spin" />
            </div>
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-cyan-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>JARVIS procesando respuesta con {currentProvider.toUpperCase()}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Texto Fijo abajo estilo ChatGPT */}
      <div className="border-t border-slate-800/80 bg-[#050811]/95 backdrop-blur-2xl p-4 relative z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Prompts Sugeridos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setInputMessage("¿Cuál es el estado de los agentes IA de JyM Tech Solutions?")}
              className="px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all whitespace-nowrap"
            >
              🤖 Estado de Agentes IA
            </button>
            <button
              onClick={() => setInputMessage("Resumir los servicios de infraestructura del servidor VPS")}
              className="px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all whitespace-nowrap"
            >
              🖥️ Resumen VPS 31.97.145.8
            </button>
            <button
              onClick={() => setInputMessage("Generar reporte ejecutivo para el cliente Walter")}
              className="px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all whitespace-nowrap"
            >
              📊 Reporte Ejecutivo Walter
            </button>
          </div>

          {/* Formulario de Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/60 rounded-2xl p-2 transition-all shadow-xl shadow-cyan-950/20"
          >
            <input
              type="text"
              placeholder="Escribe tu mensaje para JARVIS..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-blue-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <span>Enviar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
