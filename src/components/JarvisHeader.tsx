"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, User, ShieldCheck, LogOut, Database, Bot, Terminal, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import GoogleEcosystemStatus from "@/components/GoogleEcosystemStatus";
import ProviderPill from "@/components/ProviderPill";
import ProductionModeToggle from "@/components/ProductionModeToggle";
import { LLMProvider } from "@/lib/jarvisApi";

interface JarvisHeaderProps {
  provider?: LLMProvider;
  onSelectProvider?: (provider: LLMProvider, key?: string) => void;
  productionMode?: boolean;
  onProductionModeChange?: (value: boolean) => void;
  onOpenRag?: () => void;
  onOpenAgents?: () => void;
  onOpenDevOps?: () => void;
  onExport?: () => void;
}

export default function JarvisHeader({
  provider = "groq",
  onSelectProvider = () => {},
  productionMode = true,
  onProductionModeChange = () => {},
  onOpenRag,
  onOpenAgents,
  onOpenDevOps,
  onExport,
}: JarvisHeaderProps) {
  const pathname = usePathname();
  const isOperator = pathname.startsWith("/operator");

  return (
    <header className="border-b border-cyan-950/60 bg-[#050811]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-3 md:px-6 py-1.5 flex flex-wrap items-center gap-3">
        {/* Brand logo — compacto */}
        <Link href="/chat" className="flex items-center gap-2 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-white leading-none whitespace-nowrap">
            JARVIS <span className="text-cyan-400 font-light">AI</span>
          </span>
        </Link>

        {!isOperator && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-[11px] text-slate-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Asistente Activo</span>
            <span className="text-slate-500">| Dr. Walther Parrado</span>
          </div>
        )}

        {/* Badges de integraciones — fila única */}
        {!isOperator && <GoogleEcosystemStatus />}

        <div className="flex-1 min-w-[8px]" />

        {/* Selector de motor + Modo Producción + sesión — nunca se oculta ni se corta */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end w-full sm:w-auto">
          {!isOperator ? (
            <>
              {onOpenRag && (
                <button
                  type="button"
                  onClick={onOpenRag}
                  title="Abrir el grafo de vectores de memoria RAG"
                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-cyan-400 hover:border-cyan-500/40 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenAgents && (
                <button
                  type="button"
                  onClick={onOpenAgents}
                  title="Monitoreo de Agentes IA Corporativos"
                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-emerald-400 hover:border-emerald-500/40 transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenDevOps && (
                <button
                  type="button"
                  onClick={onOpenDevOps}
                  title="Consola DevOps"
                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-amber-400 hover:border-amber-500/40 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                </button>
              )}
              {onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  title="Exportar conversación como Markdown"
                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              <ProviderPill currentProvider={provider} onSelectProvider={onSelectProvider} productionMode={productionMode} />
              <ProductionModeToggle productionMode={productionMode} onChange={onProductionModeChange} />
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-red-300 hover:border-red-500/40 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/chat"
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ir al Chat Cliente</span>
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-indigo-500/40 text-[11px] font-bold text-cyan-300 shadow-lg shadow-indigo-950/30">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Panel Admin (Manuel)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
