"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Mail, MapPin, Youtube, Database, Megaphone } from "lucide-react";

interface IntegrationState {
  connected: boolean;
  detail: string;
}

interface StatusPayload {
  timestamp: string;
  integrations: {
    googleCalendar: IntegrationState;
    gmail: IntegrationState;
    googleMaps: IntegrationState;
    youtube: IntegrationState;
    rag: IntegrationState;
    metaAds: IntegrationState;
  };
}

const CAPSULES: {
  key: keyof StatusPayload["integrations"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "googleCalendar", label: "Calendar", icon: Calendar },
  { key: "gmail", label: "Gmail", icon: Mail },
  { key: "googleMaps", label: "Maps", icon: MapPin },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "metaAds", label: "Meta", icon: Megaphone },
  { key: "rag", label: "RAG", icon: Database },
];

export default function GoogleEcosystemStatus() {
  const [status, setStatus] = useState<StatusPayload["integrations"] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      const data: StatusPayload = await res.json();
      setStatus(data.integrations);
    } catch {
      // Se deja el último estado conocido; los indicadores no fingen verde.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CAPSULES.map(({ key, label, icon: Icon }) => {
        const state = status?.[key];
        const connected = !!state?.connected;
        return (
          <div
            key={key}
            title={state?.detail || "Verificando conexión..."}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
              loading
                ? "bg-slate-900/60 border-slate-800 text-slate-500"
                : connected
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10"
                : "bg-slate-900/80 border-amber-800/40 text-amber-300/80"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                loading ? "bg-slate-600" : connected ? "bg-emerald-400 animate-pulse" : "bg-amber-500"
              }`}
            />
            <Icon className="w-3 h-3" />
            <span className="hidden lg:inline">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
