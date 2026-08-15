"use client";

import React from "react";
import { PartyPopper } from "lucide-react";
import JarvisOrb from "@/components/JarvisOrb";
import TelemetryStrip from "@/components/command-center/TelemetryStrip";

// Cumpleaños del Dr. Walther Parrado: 15 de agosto. Se muestra solo ese día
// (mes/día) cada año — no queda "encendido" el resto del tiempo.
function isBirthdayToday(): boolean {
  const now = new Date();
  return now.getMonth() === 7 && now.getDate() === 15; // Agosto = índice 7
}

export default function OrbBirthdayCard() {
  const birthday = isBirthdayToday();

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center gap-3 relative overflow-hidden">
      {birthday && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-amber-500/20 animate-pulse pointer-events-none" />
      )}
      <JarvisOrb state="idle" size={96} />
      {birthday ? (
        <div className="text-center relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-sm">
            <PartyPopper className="w-4 h-4" />
            ¡Feliz cumpleaños, Dr. Walther!
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">JARVIS · Ecosistema Digital Dr. Walther Parrado</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xs font-bold text-slate-200">Núcleo JARVIS</p>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">En espera</p>
        </div>
      )}
      <TelemetryStrip />
    </div>
  );
}
