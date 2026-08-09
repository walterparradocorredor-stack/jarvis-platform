"use client";

import React, { useState, useEffect } from "react";
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
  HardDrive,
  Cpu,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { LLMProvider } from "@/lib/jarvisApi";

interface TechnicalSidebarProps {
  activeProvider: LLMProvider;
}

interface VpsStatus {
  flask: { status: string; latencyMs: number | null };
  supabase: { status: string; latencyMs: number | null };
  nextjs: { status: string; memoryMB: number; uptime: number; nodeVersion: string };
  totalCheckMs: number;
  timestamp: string;
}

function StatusBadge({ status, latencyMs }: { status: string; latencyMs?: number | null }) {
  const isUp = status === "UP";
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${
        isUp
          ? "text-emerald-400 bg-emerald-950/80 border-emerald-500/30"
          : "text-rose-400 bg-rose-950/80 border-rose-500/30"
      }`}
    >
      {isUp ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
      {status}
      {latencyMs != null && isUp && (
        <span className="font-mono text-[9px] text-emerald-300/70">{latencyMs}ms</span>
      )}
    </span>
  );
}

export default function TechnicalSidebar({ activeProvider }: TechnicalSidebarProps) {
  const [activeTab, setActiveTab] = useState<"metrics" | "webhooks" | "memory" | "logs">("metrics");
  const [expandedWebhook, setExpandedWebhook] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState(false);
  const [vpsStatus, setVpsStatus] = useState<VpsStatus | null>(null);
  const [vpsLoading, setVpsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("—");

  const fetchVpsStatus = async () => {
    try {
      setVpsLoading(true);
      const res = await fetch("/api/vps-status");
      if (res.ok) {
        const data = await res.json();
        setVpsStatus(data);
        setLastRefresh(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch {
      // silencioso
    } finally {
      setVpsLoading(false);
    }
  };

  // Poll cada 30 segundos
  useEffect(() => {
    fetchVpsStatus();
    const interval = setInterval(fetchVpsStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <aside className="w-full lg:w-80 bg-[#070c1a] border-b lg:border-b-0 lg:border-r border-cyan-950/60 flex flex-col h-full text-slate-200 overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0b1021]/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="font-extrabold text-sm tracking-wider text-white">OPERATOR PANEL</h2>
        </div>
        <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
          MANUEL / CEO
        </span>
      </div>

      {/* Telemetría Real del VPS */}
      <div className="p-4 space-y-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Telemetría en Vivo (31.97.145.8)
          </span>
          <button
            onClick={fetchVpsStatus}
            className="text-[10px] font-mono text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
            title="Actualizar telemetría"
          >
            <Clock className="w-2.5 h-2.5" />
            {lastRefresh}
          </button>
        </div>

        {/* Motor IA Activo */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-slate-300">Motor LLM Activo</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {activeProvider.toUpperCase()}
          </span>
        </div>

        {/* Flask AI Engine :5000 */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-400" />
            <span className="font-medium text-slate-300">Flask AI :5000</span>
          </div>
          {vpsLoading ? (
            <span className="text-[11px] text-slate-500 animate-pulse">Chequeando...</span>
          ) : (
            <StatusBadge
              status={vpsStatus?.flask.status || "—"}
              latencyMs={vpsStatus?.flask.latencyMs}
            />
          )}
        </div>

        {/* Supabase DB */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-slate-300">Supabase DB :8000</span>
          </div>
          {vpsLoading ? (
            <span className="text-[11px] text-slate-500 animate-pulse">Chequeando...</span>
          ) : (
            <StatusBadge
              status={vpsStatus?.supabase.status || "—"}
              latencyMs={vpsStatus?.supabase.latencyMs}
            />
          )}
        </div>

        {/* Next.js Process */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-slate-300">Next.js Process</span>
          </div>
          {vpsLoading ? (
            <span className="text-[11px] text-slate-500 animate-pulse">Chequeando...</span>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <StatusBadge status={vpsStatus?.nextjs.status || "—"} />
              {vpsStatus && (
                <span className="text-[9px] font-mono text-slate-500">
                  {vpsStatus.nextjs.memoryMB}MB · {formatUptime(vpsStatus.nextjs.uptime)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Latencia total del check */}
        {vpsStatus && (
          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-950/60 text-[10px] font-mono">
            <span className="text-slate-500">Check completo en</span>
            <span className="text-cyan-400">{vpsStatus.totalCheckMs}ms</span>
          </div>
        )}
      </div>

      {/* Módulos de Gestión */}
      <div className="p-4 space-y-3 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Módulos de Gestión
        </div>

        {/* Gestión de Webhooks */}
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
            <div className="p-3 border-t border-slate-800 text-[11px] space-y-2 bg-slate-950/60 font-mono text-slate-400">
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
                <span className="text-amber-400 font-bold">STANDBY</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Monitoreo continuo en `/api/wompi/events` y `/api/chat`
              </p>
            </div>
          )}
        </div>

        {/* Memoria RAG */}
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
            <div className="p-3 border-t border-slate-800 text-[11px] space-y-2 bg-slate-950/60 font-mono text-slate-400">
              <div className="flex justify-between items-center text-slate-300">
                <span>Cliente:</span>
                <span className="text-cyan-300 font-bold">Walther Parrado</span>
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

        {/* Consola de Logs */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Logs de Inferencia en Vivo</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] text-emerald-400/90 leading-tight space-y-1">
            <p>[SYSTEM] JARVIS Core v2.0 — Initialized</p>
            <p>[API] Streaming SSE Enabled → /api/stream</p>
            <p>[LLM] Provider: {activeProvider.toUpperCase()}</p>
            {vpsStatus && (
              <>
                <p>[VPS] Flask :5000 → {vpsStatus.flask.status}</p>
                <p>[VPS] Supabase :8000 → {vpsStatus.supabase.status}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
