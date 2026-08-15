"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Send, User, Sparkles, Check, Copy } from "lucide-react";
import { ChatMessage, LLMProvider } from "@/lib/jarvisApi";
import { supabase } from "@/lib/supabase";
import MemoryNeuralNetwork from "@/components/MemoryNeuralNetwork";
import VoiceModule from "@/components/VoiceModule";
import ImageUploadModule from "@/components/ImageUploadModule";
import JarvisOrb from "@/components/JarvisOrb";
import SlashCommandMenu, { SlashCommand } from "@/components/SlashCommandMenu";
import MemoryManagerModal from "@/components/MemoryManagerModal";
import AgentHubModal from "@/components/AgentHubModal";
import DevOpsConsoleModal from "@/components/DevOpsConsoleModal";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface ChatInterfaceProps {
  currentProvider?: LLMProvider;
  activeApiKey?: string;
  isOperatorView?: boolean;
  jarvisImageSrc?: string;
}

type OrbState = "idle" | "listening" | "thinking" | "speaking";

export interface ChatInterfaceHandle {
  openRag: () => void;
  openAgents: () => void;
  openDevOps: () => void;
  exportChat: () => void;
}

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(function ChatInterface({
  currentProvider = "groq",
  activeApiKey = "",
  isOperatorView = false,
  jarvisImageSrc,
}, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "jarvis",
      content:
        "¡Bienvenido, **Dr. Walther Parrado**! Soy **JARVIS**, la Inteligencia Artificial Corporativa de su Ecosistema Digital (**Dr. Walther Parrado & Jowhalth Academy**). ¿En qué proyecto o análisis estratégico puedo asistirle el día de hoy?",
      timestamp: "08:00 AM",
      provider: currentProvider,
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNeuralNet, setShowNeuralNet] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showDevOpsModal, setShowDevOpsModal] = useState(false);
  const [lastJarvisReply, setLastJarvisReply] = useState<string>("");
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendRef = useRef<(text?: string) => void>(() => {});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const textToSend = overrideText ?? inputMessage;
      if ((!textToSend.trim() && !selectedImage) || isLoading) return;

      const userText = textToSend.trim();
      const attachedImage = selectedImage;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: "user",
        content: userText,
        image: attachedImage || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!overrideText) setInputMessage("");
      setSelectedImage(null);
      setIsLoading(true);
      setOrbState("thinking");

      const jarvisId = (Date.now() + 1).toString();
      setStreamingId(jarvisId);
      setMessages((prev) => [
        ...prev,
        {
          id: jarvisId,
          sender: "jarvis",
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          provider: currentProvider,
        },
      ]);

      abortRef.current = new AbortController();
      const startTime = Date.now();

      try {
        const history = messages.slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.content,
        }));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch("/api/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            message: userText || "Analizar la imagen adjunta.",
            provider: currentProvider,
            apiKey: activeApiKey,
            image: attachedImage || undefined,
            history,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Error en la conexión de streaming");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";

        setOrbState("speaking");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.replace(/^data:\s*/, "").trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const textChunk = parsed.choices?.[0]?.delta?.content || "";
              if (textChunk) {
                fullReply += textChunk;
                setMessages((prev) =>
                  prev.map((m) => (m.id === jarvisId ? { ...m, content: fullReply } : m))
                );
              }
            } catch (_) {}
          }
        }

        const latencyMs = Date.now() - startTime;
        setMessages((prev) =>
          prev.map((m) => (m.id === jarvisId ? { ...m, latencyMs } : m))
        );
        setLastJarvisReply(fullReply);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === jarvisId
                ? {
                    ...m,
                    content:
                      "⚠️ *Conexión temporalmente inestable*. Dr. Walther, he registrado su mensaje. Reintentando procesamiento...",
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        setStreamingId(null);
        setOrbState("idle");
      }
    },
    [inputMessage, selectedImage, isLoading, currentProvider, activeApiKey, messages]
  );

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const handleExport = useCallback(() => {
    const mdContent = messages
      .map((m) => `### ${m.sender.toUpperCase()} (${m.timestamp})\n${m.content}\n`)
      .join("\n---\n\n");
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jarvis-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  useImperativeHandle(ref, () => ({
    openRag: () => setShowNeuralNet(true),
    openAgents: () => setShowAgentModal(true),
    openDevOps: () => setShowDevOpsModal(true),
    exportChat: handleExport,
  }));

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      setShowSlash(false);
      setInputMessage("");
      if (cmd.action === "clear") {
        setMessages([
          {
            id: Date.now().toString(),
            sender: "jarvis",
            content:
              "✅ Nueva conversación iniciada. ¿En qué puedo asistirle, Estimado Dr. Walther?",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            provider: currentProvider,
          },
        ]);
      } else if (cmd.action === "export") {
        handleExport();
      } else if (cmd.action === "image") {
        document.querySelector<HTMLElement>('input[type="file"]')?.click();
      } else if (cmd.action === "voice") {
        document.getElementById("jarvis-voice-btn")?.click();
      } else if (cmd.prompt) {
        handleSendRef.current(cmd.prompt);
      }
    },
    [currentProvider, handleExport]
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] relative overflow-hidden">
      {/* Fondo Neón */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Contenedor Principal: Chat a ancho completo (el grafo RAG vive en un drawer aparte; los
          controles de Vectores RAG/Agentes IA/DevOps/Exportar viven en el header, no aquí) */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Area de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 w-full max-w-full">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                {msg.sender === "jarvis" ? (
                  <div className="shrink-0">
                    <JarvisOrb
                      state={streamingId === msg.id ? orbState : "idle"}
                      size={36}
                      imageSrc={jarvisImageSrc}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
                    <User className="w-5 h-5" />
                  </div>
                )}

                {/* Burbuja */}
                <div className="w-full max-w-full space-y-1">
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
                        <Sparkles className="w-2.5 h-2.5" />
                        {msg.latencyMs}ms
                      </span>
                    )}
                    {streamingId === msg.id && (
                      <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40 animate-pulse">
                        STREAMING
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed relative group shadow-md ${
                      msg.sender === "user"
                        ? "bg-gradient-to-br from-cyan-950/80 to-slate-900/90 text-slate-100 border border-cyan-500/30 rounded-tr-none"
                        : "bg-slate-900/80 backdrop-blur-md border border-slate-800/90 text-slate-200 rounded-tl-none hover:border-slate-700 transition-colors"
                    }`}
                  >
                    {msg.image && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-cyan-500/30 max-w-sm">
                        <img src={msg.image} alt="Visión Adjunta" className="w-full h-auto object-cover" />
                      </div>
                    )}

                    <MarkdownRenderer content={msg.content} />

                    {streamingId === msg.id && (
                      <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
                    )}

                    {msg.content && streamingId !== msg.id && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="absolute top-2 right-2 p-1 rounded bg-slate-800/60 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && !streamingId && (
              <div className="flex items-center gap-3">
                <JarvisOrb state="thinking" size={36} imageSrc={jarvisImageSrc} />
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-cyan-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>JARVIS conectando con {currentProvider.toUpperCase()}...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Fijo */}
          <div className="border-t border-slate-800/80 bg-[#050811]/95 backdrop-blur-2xl p-4 relative z-20">
            <div className="w-full max-w-full flex flex-col gap-2">
              {/* Prompts Sugeridos */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  {
                    label: "📅 Daily Briefing",
                    prompt:
                      "Generar un Daily Briefing Ejecutivo para el Dr. Walther Parrado usando únicamente los datos reales disponibles.",
                  },
                  {
                    label: "📧 Correos Gmail",
                    prompt: "¿Cuál es el estado real de mi bandeja de Gmail ahora mismo?",
                  },
                  {
                    label: "🗓️ Agenda Calendar",
                    prompt: "¿Cuál es mi próxima cita real registrada en Calendar?",
                  },
                  {
                    label: "🗺️ Rutas y Tráfico",
                    prompt: "¿Tienes acceso en vivo a rutas y tráfico con Google Maps en este momento?",
                  },
                  {
                    label: "📈 SEO & Tráfico Web",
                    prompt: "Resume el estado real de SEO de waltherparrado.com que tengas disponible.",
                  },
                  {
                    label: "✅ Mis Tareas Pendientes",
                    prompt:
                      "Con base en el estado real del ecosistema (Wompi, Meta Ads, Gmail, Calendar), ¿cuáles son mis prioridades ejecutivas de hoy?",
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 shrink-0 transition-all text-[11px]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Input con Slash Commands */}
              <div className="relative">
                {showSlash && (
                  <SlashCommandMenu
                    query={slashQuery}
                    onSelect={handleSlashSelect}
                    onClose={() => setShowSlash(false)}
                  />
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/60 rounded-2xl p-2 transition-all shadow-xl shadow-cyan-950/20"
                >
                  <ImageUploadModule
                    onImageSelected={setSelectedImage}
                    selectedImage={selectedImage}
                  />

                  <VoiceModule
                    onInterimResult={(text) => setInputMessage(text)}
                    onSpeechResult={(text) => {
                      setInputMessage(text);
                      setOrbState("listening");
                      handleSendRef.current(text);
                    }}
                    lastJarvisMessage={lastJarvisReply}
                    autoSpeak={false}
                  />

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Escribe '/' para comandos, dicta por voz o adjunta imagen..."
                    value={inputMessage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputMessage(val);
                      if (val.startsWith("/")) {
                        setShowSlash(true);
                        setSlashQuery(val);
                      } else {
                        setShowSlash(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowSlash(false);
                    }}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                  >
                    <span>Enviar</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal centrado premium: Grafo de Vectores de Memoria RAG */}
      {showNeuralNet && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNeuralNet(false)}
          />
          <div className="relative w-[80vw] max-w-6xl h-[80vh] animate-fadeIn">
            <MemoryNeuralNetwork
              isActive={isLoading}
              activeQuery={inputMessage}
              onClose={() => setShowNeuralNet(false)}
              onManage={() => {
                setShowNeuralNet(false);
                setShowMemoryModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Modals de Extensión */}
      <MemoryManagerModal isOpen={showMemoryModal} onClose={() => setShowMemoryModal(false)} />
      <AgentHubModal isOpen={showAgentModal} onClose={() => setShowAgentModal(false)} />
      <DevOpsConsoleModal isOpen={showDevOpsModal} onClose={() => setShowDevOpsModal(false)} />
    </div>
  );
});

export default ChatInterface;
