"use client";

import React, { useState } from "react";
import {
  Activity,
  Database,
  Webhook,
  Brain,
  Terminal,
  ShieldCheck,
  Zap,
  Server,
  ChevronRight,
  ChevronDown,
  Layers,
  FileCode,
  HardDrive
} from "lucide-react";
import { LLMProvider } from "@/lib/jarvisApi";

interface TechnicalSidebarProps {
  activeProvider: LLMProvider;
}

export default function TechnicalSidebar({ activeProvider }: TechnicalSidebarProps) {
  const [activeTab, setActiveTab] = useState<"metrics" | "webhooks" | "memory" | "logs">("metrics");
  const [expandedWebhook, setExpandedWebhook] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState(false);

  return (
    <aside className="w-full lg:w-80 bg-[#070c1a] border-b lg:border-b-0 lg:border-r border-cyan-950/60 flex flex-col h-full text-slate-200 overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0b1021]/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="font-extrabold text-sm tracking-wider text-white">
            OPERATOR PANEL
          </h2>
        </div>
        <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
          MANUEL / CEO
        </span>
      </div>

      {/* Indicadores de Salud del VPS & IA */}
      <div className="p-4 space-y-3 border-b border-slate-800/80">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Telemetría del Servidor (VPS 31.97.145.8)
        </div>

        {/* Status Motor IA */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-slate-300">Motor IA Active</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {activeProvider.toUpperCase()}
          </span>
        </div>

        {/* Status Supabase DB */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-slate-300">Supabase DB</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            OK (:8000)
          </span>
        </div>

        {/* Status RAM VPS */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-slate-300">Recursos RAM VPS</span>
          </div>
          <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/30">
            {activeProvider === "local" ? "Llama 3.1 Active" : "100% Ahorrado"}
          </span>
        </div>
      </div>

      {/* Navegación por Paneles de Control (Sin Modales) */}
      <div className="p-4 space-y-3 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Módulos de Gestión
        </div>

        {/* 1. Gestión de Webhooks */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => setExpandedWebhook(!expandedWebhook)}
            className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-cyan-400" />
              <span>Gestión de Webhooks</span>
            </div>
            {expandedWebhook ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedWebhook && (
            <div className="p-3 border-t border-slate-800 text-[11px] space-y-2 bg-slate-950/60 font-mono text-slate-400 animate-fadeIn">
              <div className="flex justify-between items-center text-slate-300">
                <span>• Telegram Webhook</span>
                <span className="text-emerald-400 font-bold">ACTIVO</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>• WhatsApp Meta API</span>
                <span className="text-emerald-400 font-bold">ACTIVO</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>• Wompi Eventos</span>
                <span className="text-emerald-400 font-bold">STANDBY</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Monitoreo continuo en `/api/wompi/events` y `/api/chat`
              </p>
            </div>
          )}
        </div>

        {/* 2. Memoria del Cliente (RAG) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => setExpandedMemory(!expandedMemory)}
            className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Memoria del Cliente (RAG)</span>
            </div>
            {expandedMemory ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedMemory && (
            <div className="p-3 border-t border-slate-800 text-[11px] space-y-2 bg-slate-950/60 font-mono text-slate-400 animate-fadeIn">
              <div className="flex justify-between items-center text-slate-300">
                <span>Cliente:</span>
                <span className="text-cyan-300 font-bold">Walter Parrado</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Embeddings Supabase:</span>
                <span className="text-purple-300">1,420 vectores</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Contexto activo: Proyectos SaaS, Cursos Saber 11, Consultoría IA B2B
              </p>
            </div>
          )}
        </div>

        {/* 3. Consola de Inferencia */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Logs de Inferencia en Vivo</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] text-emerald-400/90 leading-tight space-y-1">
            <p>[SYSTEM] JARVIS Core Initialized</p>
            <p>[API] Route POST /api/chat 200 OK</p>
            <p>[LLM] Provider: {activeProvider}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
