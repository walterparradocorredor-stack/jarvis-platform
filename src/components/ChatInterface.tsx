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
        "¡Bienvenido, **Dr. Walther Parrado**! Soy **JARVIS**, la Inteligencia Artificial Corporativa de su Ecosistema Digital (**JyM Tech Solutions & Jowhalth Academy**). ¿En qué proyecto o análisis estratégico puedo asistirle el día de hoy?",
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

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInputMessage("");
    setIsLoading(true);

    try {
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
      console.error("Error al enviar mensaje:", err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "jarvis",
        content: `⚠️ **Error de Conexión:** No se pudo procesar la solicitud. ${err.message || ""}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: currentProvider,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] relative overflow-hidden">
      {/* Fondo Neón de Red Neuronal */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))]" />

      {/* Area de Chat / Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative z-10 max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 sm:gap-4 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.sender === "user"
                  ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-cyan-500/20"
                  : "bg-slate-900 border border-cyan-500/40 text-cyan-400 shadow-cyan-500/10"
              }`}
            >
              {msg.sender === "user" ? <User className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
            </div>

            {/* Burbuja del Mensaje */}
            <div className={`max-w-[85%] sm:max-w-[75%] space-y-1`}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-bold text-slate-400">
                  {msg.sender === "user"
                    ? isOperatorView
                      ? "Manuel (CEO)"
                      : "Dr. Walther Parrado"
                    : "JARVIS AI Core"}
                </span>
                {msg.latencyMs && (
                  <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                    {msg.latencyMs}ms
                  </span>
                )}
                <span className="text-[10px] text-slate-600 ml-auto">{msg.timestamp}</span>
              </div>

              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative group shadow-md ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-cyan-950/80 to-slate-900/90 text-slate-100 border border-cyan-500/30 rounded-tr-none"
                    : "bg-slate-900/80 backdrop-blur-md border border-slate-800/90 text-slate-200 rounded-tl-none hover:border-slate-700 transition-colors"
                }`}
              >
                {msg.content}

                {/* Botón para copiar */}
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="absolute top-2 right-2 p-1 rounded bg-slate-800/60 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                  title="Copiar respuesta"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Indicador de Carga */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            </div>
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-cyan-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>JARVIS analizando respuesta ejecutiva con {currentProvider.toUpperCase()}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Texto Fijo abajo estilo ChatGPT */}
      <div className="border-t border-slate-800/80 bg-[#050811]/95 backdrop-blur-2xl p-4 relative z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Prompts Sugeridos Corporativos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => {
                const prompt = "Generar un reporte ejecutivo integral del Ecosistema Digital y la plataforma Jowhalth Academy para el Dr. Walther Parrado.";
                setInputMessage(prompt);
                handleSend(prompt);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              📊 Reporte Ejecutivo Walther Parrado
            </button>
            <button
              onClick={() => {
                const prompt = "Proporcionar un resumen ejecutivo de la infraestructura activa del VPS 31.97.145.8 y las plataformas en producción.";
                setInputMessage(prompt);
                handleSend(prompt);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              🖥️ Infraestructura VPS (31.97.145.8)
            </button>
            <button
              onClick={() => {
                const prompt = "Resumir el estado actual de los agentes de IA, integraciones con correo electrónico, WhatsApp IA y servicios proyectados.";
                setInputMessage(prompt);
                handleSend(prompt);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              🤖 Agentes IA & Integraciones
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
              placeholder="Escribe tu mensaje o consulta estratégica para JARVIS..."
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
