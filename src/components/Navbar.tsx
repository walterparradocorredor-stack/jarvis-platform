"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Cpu, User, ShieldCheck, Terminal, Layers } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isOperator = pathname.startsWith("/operator");

  return (
    <header className="border-b border-cyan-950/60 bg-[#050811]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* Brand logo & status */}
        <Link href="/" className="flex items-center gap-3 group">
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

        {/* Profile Switcher (Walter vs Manuel) */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <Link
            href="/chat"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !isOperator
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perfil Walter</span>
            <span className="hidden md:inline text-[10px] opacity-80">(Cliente)</span>
          </Link>

          <Link
            href="/operator"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isOperator
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
            <span>Perfil Manuel</span>
            <span className="hidden md:inline text-[10px] opacity-80">(CEO / Admin)</span>
          </Link>
        </div>

      </div>
    </header>
  );
}
