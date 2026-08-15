"use client";

import React, { useEffect, useState } from "react";
import { Server, Database, Activity } from "lucide-react";

interface VpsStatus {
  supabase: { status: string; latencyMs: number | null };
  nextjs: { status: string };
}

export default function TelemetryStrip() {
  const [status, setStatus] = useState<VpsStatus | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/vps-status", { cache: "no-store" })
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const vpsUp = status?.nextjs?.status === "UP";
  const dbUp = status?.supabase?.status === "UP";
  const latency = status?.supabase?.latencyMs;

  const Pill = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <span
      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
        ok
          ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
          : "bg-slate-900/80 border-amber-800/40 text-amber-300/80"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400 animate-pulse" : "bg-amber-500"}`} />
      {children}
    </span>
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Pill ok={vpsUp}>
        <Server className="w-3 h-3" /> VPS {vpsUp ? "ONLINE" : "..."}
      </Pill>
      <Pill ok={dbUp}>
        <Database className="w-3 h-3" /> DB {dbUp ? "ONLINE" : "..."}
      </Pill>
      <Pill ok={dbUp && latency != null}>
        <Activity className="w-3 h-3" /> LATENCIA {latency != null ? `${latency}ms` : "..."}
      </Pill>
    </div>
  );
}
