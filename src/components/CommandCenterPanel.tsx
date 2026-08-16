"use client";

import React, { useEffect, useState } from "react";
import { Cpu, Database, Gauge, Radio } from "lucide-react";
import JarvisOrb from "@/components/JarvisOrb";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface CommandCenterPanelProps {
  orbState: OrbState;
  latencyMs?: number | null;
  jarvisImageSrc?: string;
}

interface VpsStatus {
  flask: { status: string };
  supabase: { status: string };
}

const STATE_LABEL: Record<OrbState, string> = {
  idle: "EN ESPERA",
  listening: "ESCUCHANDO",
  thinking: "PROCESANDO",
  speaking: "RESPONDIENDO",
};

export default function CommandCenterPanel({ orbState, latencyMs, jarvisImageSrc }: CommandCenterPanelProps) {
  const [clock, setClock] = useState("--:--:--");
  const [vpsStatus, setVpsStatus] = useState<VpsStatus | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("es-CO", { hour12: false }));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/vps-status");
        if (res.ok) setVpsStatus(await res.json());
      } catch {
        /* mantener último estado conocido */
      }
    };
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const vpsUp = vpsStatus?.flask?.status === "UP";
  const dbUp = vpsStatus?.supabase?.status === "UP" || vpsStatus?.supabase?.status === "ERROR";

  return (
    <div className="w-80 sm:w-88 shrink-0 bg-[#060a17]/95 border-l border-b border-cyan-500/30 relative overflow-hidden backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_65%)] pointer-events-none" />
      {/* Reticula cyber de fondo */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 p-5 flex flex-col items-center gap-3 border-b border-cyan-950/80">
        <div className="relative">
          <JarvisOrb state={orbState} size={128} imageSrc={jarvisImageSrc} />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "0 0 40px 4px rgba(6,182,212,0.25)" }}
          />
        </div>
        <div className="text-center">
          <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-cyan-300">
            {STATE_LABEL[orbState]}
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-wider tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {clock}
          </div>
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            Sesión Activa · JARVIS Core
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 divide-x divide-cyan-950/60 border-b border-cyan-950/80">
        <div className="px-2 py-3 flex flex-col items-center gap-1">
          <Cpu className={`w-3.5 h-3.5 ${vpsUp ? "text-emerald-400" : "text-slate-600"}`} />
          <span className="text-[8.5px] font-mono text-slate-500 uppercase">VPS</span>
          <span className={`text-[9.5px] font-mono font-bold ${vpsUp ? "text-emerald-400" : "text-slate-600"}`}>
            {vpsStatus ? (vpsUp ? "ONLINE" : "OFFLINE") : "..."}
          </span>
        </div>
        <div className="px-2 py-3 flex flex-col items-center gap-1">
          <Database className={`w-3.5 h-3.5 ${dbUp ? "text-cyan-400" : "text-slate-600"}`} />
          <span className="text-[8.5px] font-mono text-slate-500 uppercase">DB</span>
          <span className={`text-[9.5px] font-mono font-bold ${dbUp ? "text-cyan-400" : "text-slate-600"}`}>
            {vpsStatus ? (dbUp ? "ONLINE" : "OFFLINE") : "..."}
          </span>
        </div>
        <div className="px-2 py-3 flex flex-col items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[8.5px] font-mono text-slate-500 uppercase">Latencia</span>
          <span className="text-[9.5px] font-mono font-bold text-purple-300">
            {latencyMs ? `${latencyMs}ms` : "N/D"}
          </span>
        </div>
      </div>

      <div className="relative z-10 px-4 py-2 flex items-center gap-2 text-[9.5px] font-mono text-slate-500">
        <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span>Centro de Comando Corporativo — JyM Tech Solutions</span>
      </div>
    </div>
  );
}
