"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, User, ShieldCheck, Lock, Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isOperator = pathname.startsWith("/operator");

  return (
    <header className="border-b border-cyan-950/60 bg-[#050811]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* Brand logo & status */}
        <Link href="/chat" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">
                JARVIS <span className="text-cyan-400 font-light">AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                v3.1
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              JyM Tech Solutions — Enterprise AI Engine
            </p>
          </div>
        </Link>

        {/* Header Right Element */}
        <div className="flex items-center gap-3">
          {/* Si está en la vista de cliente (Walter), SOLO se muestra su badge de estado de conexión activo */}
          {!isOperator ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-slate-200">Asistente Activo</span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">| Dr. Walther Parrado</span>
            </div>
          ) : (
            /* Si está en la vista de operador (Manuel), se muestra el distintivo de Admin y botón de regresar al Chat */
            <div className="flex items-center gap-3">
              <Link
                href="/chat"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Ir al Chat Cliente</span>
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-indigo-500/40 text-xs font-bold text-cyan-300 shadow-lg shadow-indigo-950/30">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Panel Admin (Manuel)</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
