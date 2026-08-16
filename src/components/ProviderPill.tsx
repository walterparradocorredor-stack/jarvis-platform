"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Zap, Cloud, Sparkles, Server } from "lucide-react";
import { LLMProvider } from "@/lib/jarvisApi";
import { supabase } from "@/lib/supabase";

interface ProviderPillProps {
  currentProvider: LLMProvider;
  onSelectProvider: (provider: LLMProvider, key?: string) => void;
  productionMode: boolean;
}

const PROVIDERS: {
  id: LLMProvider;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  productionSafe: boolean;
}[] = [
  { id: "groq", label: "Groq", sublabel: "GPT-OSS 120B (Fast)", icon: Zap, color: "text-cyan-400", productionSafe: true },
  { id: "openai", label: "OpenAI", sublabel: "GPT-4o mini", icon: Cloud, color: "text-blue-400", productionSafe: true },
  { id: "gemini", label: "Gemini", sublabel: "2.5 Flash", icon: Sparkles, color: "text-indigo-400", productionSafe: true },
  { id: "local", label: "Llama 3.1", sublabel: "Motor local VPS", icon: Server, color: "text-purple-400", productionSafe: false },
];

export default function ProviderPill({ currentProvider, onSelectProvider, productionMode }: ProviderPillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = PROVIDERS.find((p) => p.id === currentProvider) || PROVIDERS[0];

  const handleSelect = async (p: (typeof PROVIDERS)[number]) => {
    if (productionMode && !p.productionSafe) return; // Modo Producción bloquea el motor local
    localStorage.setItem("jarvis_active_provider", p.id);
    onSelectProvider(p.id);
    setOpen(false);
    // Merge real: leer el content actual y solo tocar activeProvider — un
    // update({ content: {...} }) directo REEMPLAZA toda la columna jsonb y
    // borra las API keys reales (groqKey/openaiKey/geminiKey) guardadas ahí.
    try {
      const { data } = await supabase
        .from("cms_content")
        .select("content")
        .eq("id", "jarvis_config")
        .single();
      const current = (data?.content as Record<string, unknown>) || {};
      await supabase
        .from("cms_content")
        .update({ content: { ...current, activeProvider: p.id } })
        .eq("id", "jarvis_config");
    } catch {
      // No bloquear el cambio de motor en pantalla si falla el guardado remoto.
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-[11px] font-semibold text-slate-200 hover:border-cyan-500/50 transition-colors"
      >
        <active.icon className={`w-3.5 h-3.5 ${active.color}`} />
        <span className="hidden sm:inline">{active.label}</span>
        <span className="hidden lg:inline text-slate-500 font-mono">{active.sublabel}</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-cyan-900/50 bg-[#0b1021] shadow-2xl shadow-black/50 overflow-hidden z-50">
          {PROVIDERS.map((p) => {
            const disabled = productionMode && !p.productionSafe;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(p)}
                title={disabled ? "Bloqueado en Modo Producción" : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  p.id === currentProvider ? "bg-cyan-950/50" : "hover:bg-slate-900"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <p.icon className={`w-3.5 h-3.5 ${p.color}`} />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">{p.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{p.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
