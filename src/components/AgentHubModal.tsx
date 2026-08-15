"use client";

import React from "react";
import { Bot, MessageSquare, ShieldCheck, Zap, X, ExternalLink, Sparkles } from "lucide-react";

interface AgentHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentItem {
  id: string;
  name: string;
  role: string;
  status: "active" | "standby" | "development";
  engine: string;
  server: string;
  iconColor: string;
}

const AGENTS: AgentItem[] = [
  {
    id: "1",
    name: "JARVIS Core Asistente",
    role: "Inteligencia Corporativa 360° para Walther Parrado",
    status: "active",
    engine: "Groq OpenAI GPT-OSS 120B / GPT-4o",
    server: "VPS 31.97.145.8:3080",
    iconColor: "text-cyan-400 border-cyan-500/40 bg-cyan-950/80",
  },
  {
    id: "2",
    name: "Agente zetugc.com",
    role: "Contenido UGC y Automatizaciones",
    status: "active",
    engine: "n8n + Meta API",
    server: "VPS 31.97.145.8",
    iconColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/80",
  },
  {
    id: "3",
    name: "Agente Rentun Group",
    role: "Ecosistema Comercial Rentun Group",
    status: "active",
    engine: "Supabase + Vector RAG",
    server: "VPS 31.97.145.8",
    iconColor: "text-amber-400 border-amber-500/40 bg-amber-950/80",
  },
  {
    id: "4",
    name: "Agente Jowhalth Academy Tutor",
    role: "Asistencia a Estudiantes y Control de Pagos Wompi",
    status: "active",
    engine: "PocketBase DB + Vector RAG",
    server: "Hostinger srv888548.hstgr.cloud",
    iconColor: "text-purple-400 border-purple-500/40 bg-purple-950/80",
  },
  {
    id: "5",
    name: "Agente Workflows n8n & Email",
    role: "Automatizaciones SMTP & Workflows Transaccionales",
    status: "development",
    engine: "n8n Self-Hosted",
    server: "VPS Docker :5678",
    iconColor: "text-blue-400 border-blue-500/40 bg-blue-950/80",
  },
];

export default function AgentHubModal({ isOpen, onClose }: AgentHubModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#080d21] border border-cyan-500/40 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-cyan-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Centro de Control de Agentes IA Corporativos
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  4 ACTIVOS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Ecosistema Digital Dr. Walther Parrado Corredor
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matrix de Agentes */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg border ${agent.iconColor}`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      agent.status === "active"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : "bg-amber-950 text-amber-300 border-amber-800"
                    }`}
                  >
                    {agent.status === "active" ? "● OPERATIVO" : "⏳ EN DESARROLLO"}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {agent.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{agent.role}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{agent.engine}</span>
                <span className="text-slate-400">{agent.server}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            Red Multiorquestada de Inteligencia Artificial
          </span>
          <span>Desarrollado por JyM Tech Solutions</span>
        </div>
      </div>
    </div>
  );
}
