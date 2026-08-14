"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Sparkles, Check, Copy, Brain, Download, Cpu, Database, Bot, Terminal } from "lucide-react";
import { ChatMessage, LLMProvider } from "@/lib/jarvisApi";
import MemoryNeuralNetwork from "@/components/MemoryNeuralNetwork";
import CommandCenterPanel from "@/components/CommandCenterPanel";
import VoiceModule from "@/components/VoiceModule";
import ImageUploadModule from "@/components/ImageUploadModule";
import JarvisOrb from "@/components/JarvisOrb";
import SlashCommandMenu, { SlashCommand } from "@/components/SlashCommandMenu";
import MemoryManagerModal from "@/components/MemoryManagerModal";
import AgentHubModal from "@/components/AgentHubModal";
import DevOpsConsoleModal from "@/components/DevOpsConsoleModal";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import IntegrationStatusBadges from "@/components/IntegrationStatusBadges";
import CameraVisionModule from "@/components/CameraVisionModule";

interface ChatInterfaceProps {
  currentProvider?: LLMProvider;
  activeApiKey?: string;
  isOperatorView?: boolean;
  jarvisImageSrc?: string;
}

type OrbState = "idle" | "listening" | "thinking" | "speaking";

export default function ChatInterface({
  currentProvider = "groq",
  activeApiKey = "",
  isOperatorView = false,
  jarvisImageSrc,
}: ChatInterfaceProps) {
  const [activeProvider, setActiveProvider] = useState<LLMProvider>(currentProvider);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "jarvis",
      content:
        "¡Bienvenido, **Dr. Walther Parrado**! Soy **JARVIS**, la Inteligencia Artificial Corporativa de su Ecosistema Digital (**JyM Tech Solutions & Jowhalth Academy**). ¿En qué proyecto o análisis estratégico puedo asistirle el día de hoy?",
      timestamp: "08:00 AM",
      provider: activeProvider,
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNeuralNet, setShowNeuralNet] = useState(true);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showDevOpsModal, setShowDevOpsModal] = useState(false);
  const [lastJarvisReply, setLastJarvisReply] = useState<string>("");
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendRef = useRef<(text?: string, image?: string) => void>(() => {});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (overrideText?: string, overrideImage?: string) => {
      const textToSend = overrideText ?? inputMessage;
      const imageToSend = overrideImage ?? selectedImage;
      if ((!textToSend.trim() && !imageToSend) || isLoading) return;

      const userText = textToSend.trim();
      const attachedImage = imageToSend;

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
          provider: activeProvider,
        },
      ]);

      abortRef.current = new AbortController();
      const startTime = Date.now();

      try {
        const history = messages.slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.content,
        }));

        const res = await fetch("/api/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText || "Analizar la imagen adjunta.",
            provider: activeProvider,
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
    [inputMessage, selectedImage, isLoading, activeProvider, activeApiKey, messages]
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
            provider: activeProvider,
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
    [activeProvider, handleExport]
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Botones Ejecutivos: invocan datos REALES vía tools-bridge, sin pasar por el LLM ──
  const pushJarvisMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "jarvis",
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: activeProvider,
      },
    ]);
  }, [activeProvider]);

  const runQuickTool = useCallback(
    async (kind: "briefing" | "gmail" | "calendar" | "maps" | "seo" | "tasks") => {
      if (isLoading) return;
      setIsLoading(true);
      setOrbState("thinking");
      try {
        if (kind === "briefing") {
          const res = await fetch("/api/tools/daily-briefing");
          const data = await res.json();
          pushJarvisMessage(data.text || `⚠️ No se pudo generar el Daily Briefing: ${data.error}`);
        } else if (kind === "gmail") {
          const res = await fetch("/api/tools/gmail-summary");
          const data = await res.json();
          pushJarvisMessage(res.ok ? data.text : `⚠️ No se pudo consultar Gmail: ${data.error}`);
        } else if (kind === "calendar") {
          const res = await fetch("/api/tools/calendar-agenda?range=today");
          const data = await res.json();
          pushJarvisMessage(res.ok ? data.text : `⚠️ No se pudo consultar Calendar: ${data.error}`);
        } else if (kind === "maps") {
          const destination = window.prompt("¿Hacia dónde? (destino)");
          if (!destination) {
            setIsLoading(false);
            setOrbState("idle");
            return;
          }
          const origin = window.prompt("¿Desde dónde? (origen)", "Bogotá, Colombia") || "Bogotá, Colombia";
          const res = await fetch(
            `/api/tools/maps-route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
          );
          const data = await res.json();
          pushJarvisMessage(res.ok ? data.text : `⚠️ No se pudo calcular la ruta: ${data.error}`);
        } else if (kind === "seo") {
          const res = await fetch("/api/tools/search-console");
          const data = await res.json();
          pushJarvisMessage(res.ok ? data.text : `⚠️ No se pudo consultar Search Console: ${data.error}`);
        } else if (kind === "tasks") {
          const res = await fetch("/api/tools/tasks");
          const data = await res.json();
          pushJarvisMessage(res.ok ? data.text : `⚠️ No se pudo consultar Tasks: ${data.error}`);
        }
      } catch (err: any) {
        pushJarvisMessage(`⚠️ Error de conexión con las herramientas MCP: ${err.message}`);
      } finally {
        setIsLoading(false);
        setOrbState("idle");
      }
    },
    [isLoading, pushJarvisMessage]
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] relative overflow-hidden">
      {/* Fondo Neón */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Controls Bar */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between z-20 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNeuralNet(!showNeuralNet)}
            className={`hidden lg:flex px-3 py-1.5 rounded-xl border text-xs font-semibold items-center gap-2 transition-all ${
              showNeuralNet
                ? "bg-cyan-950/90 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {showNeuralNet ? "Ocultar Memoria RAG" : "Ver Memoria RAG"}
            </span>
          </button>

          <button
            onClick={() => setShowMemoryModal(true)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
            title="Abrir gestor de vectores de memoria RAG"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Vectores RAG</span>
          </button>

          <button
            onClick={() => setShowAgentModal(true)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 transition-all"
            title="Monitoreo de Agentes IA Corporativos"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Agentes IA</span>
          </button>

          <button
            onClick={() => setShowDevOpsModal(true)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all"
            title="Consola DevOps Manuel (CEO)"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">DevOps</span>
          </button>

          <button
            onClick={handleExport}
            title="Exportar conversación como Markdown"
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector Dinámico de Motor LLM */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs shadow-inner">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value as LLMProvider)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="groq" className="bg-slate-950 text-slate-200">
                ⚡ Groq Llama 3.3 (70B Fast)
              </option>
              <option value="openai" className="bg-slate-950 text-slate-200">
                🧠 OpenAI GPT-4o Mini
              </option>
              <option value="gemini" className="bg-slate-950 text-slate-200">
                💎 Gemini 2.5 Flash Vision
              </option>
              <option value="local" className="bg-slate-950 text-slate-200">
                🔒 Qwen 2.5 14B Local (VPS)
              </option>
            </select>
          </div>

          <CameraVisionModule
            onOpen={() => setActiveProvider("gemini")}
            onCapture={(dataUrl) => {
              setActiveProvider("gemini");
              handleSendRef.current("Analiza esta imagen: ¿qué ves?", dataUrl);
            }}
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
        </div>
      </div>

      {/* Badges de Estado de Integraciones MCP */}
      <div className="px-4 py-1.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-end z-20">
        <IntegrationStatusBadges />
      </div>

      {/* Contenedor Principal: Chat + Panel Lateral RAG */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Columna Principal del Chat */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Area de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
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
                <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
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
                  <span>JARVIS conectando con {activeProvider.toUpperCase()}...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Fijo */}
          <div className="border-t border-slate-800/80 bg-[#050811]/95 backdrop-blur-2xl p-4 relative z-20">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              {/* Botones Ejecutivos: invocan datos reales vía MCP bridge (no LLM) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { label: "📰 Daily Briefing", kind: "briefing" as const },
                  { label: "📧 Correos Gmail", kind: "gmail" as const },
                  { label: "📅 Agenda Calendar", kind: "calendar" as const },
                  { label: "🗺️ Rutas y Tráfico", kind: "maps" as const },
                  { label: "🔍 SEO & Tráfico Web", kind: "seo" as const },
                  { label: "📝 Mis Tareas Pendientes", kind: "tasks" as const },
                ].map((item) => (
                  <button
                    key={item.kind}
                    onClick={() => runQuickTool(item.kind)}
                    disabled={isLoading}
                    className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 shrink-0 transition-all text-[11px] disabled:opacity-40"
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

        {/* Panel Lateral Derecho: Centro de Comando (Orbe + Métricas) + Red Neuronal RAG */}
        {showNeuralNet && (
          <div className="hidden lg:flex flex-col h-full shrink-0">
            <CommandCenterPanel
              orbState={orbState}
              latencyMs={[...messages].reverse().find((m) => m.latencyMs)?.latencyMs}
              jarvisImageSrc={jarvisImageSrc}
            />
            <MemoryNeuralNetwork
              isActive={isLoading}
              activeQuery={inputMessage}
              onClose={() => setShowNeuralNet(false)}
            />
          </div>
        )}
      </div>

      {/* Modals de Extensión */}
      <MemoryManagerModal isOpen={showMemoryModal} onClose={() => setShowMemoryModal(false)} />
      <AgentHubModal isOpen={showAgentModal} onClose={() => setShowAgentModal(false)} />
      <DevOpsConsoleModal isOpen={showDevOpsModal} onClose={() => setShowDevOpsModal(false)} />
    </div>
  );
}
