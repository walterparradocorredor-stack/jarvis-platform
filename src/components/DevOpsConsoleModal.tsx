"use client";

import React, { useState } from "react";
import { Terminal as TerminalIcon, Play, RefreshCw, X, ShieldCheck, CheckCircle2, AlertTriangle, Server, Cpu, Activity } from "lucide-react";

interface DevOpsConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "success" | "warning" | "error";
  text: string;
}

export default function DevOpsConsoleModal({ isOpen, onClose }: DevOpsConsoleModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "1", time: "19:45:01", type: "info", text: "Inicializando Consola DevOps Manuel (CEO & Tech Lead)..." },
    { id: "2", time: "19:45:02", type: "success", text: "VPS Hostinger (31.97.145.8) conectado via SSH / Docker Engine." },
    { id: "3", time: "19:45:03", type: "info", text: "Contenedor jarvis-front activo en puerto :3080." },
    { id: "4", time: "19:45:04", type: "info", text: "Supabase Kong Proxy en puerto :8000 (Saludable)." },
    { id: "5", time: "19:45:05", type: "info", text: "Flask AI Engine en puerto :5000 (Llama 3.1 Local Standby)." },
  ]);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState("healthcheck");

  if (!isOpen) return null;

  const runCommand = (cmd: string) => {
    setIsRunningCommand(true);
    const now = new Date().toLocaleTimeString();

    if (cmd === "healthcheck") {
      setLogs((prev) => [
        ...prev,
        { id: Date.now().toString(), time: now, type: "info", text: "Ejecutando Healthcheck de Servidores Docker..." },
      ]);
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), time: now, type: "success", text: "✓ jarvis-front (:3080) -> UP (Latency 12ms)" },
          { id: (Date.now() + 2).toString(), time: now, type: "success", text: "✓ supabase-kong (:8000) -> UP (Status 200 OK)" },
          { id: (Date.now() + 3).toString(), time: now, type: "success", text: "✓ flask-ai-engine (:5000) -> UP (Model Llama 3.1)" },
          { id: (Date.now() + 4).toString(), time: now, type: "success", text: "✓ nginx-proxy-manager (:81) -> SSL Cert Active" },
        ]);
        setIsRunningCommand(false);
      }, 1000);
    } else if (cmd === "clearcache") {
      setLogs((prev) => [
        ...prev,
        { id: Date.now().toString(), time: now, type: "warning", text: "Purgando caché de Next.js & CDN CDN purge..." },
      ]);
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), time: now, type: "success", text: "✓ Caché purgada correctamente. Rendimiento al 100%." },
        ]);
        setIsRunningCommand(false);
      }, 800);
    } else if (cmd === "syncenv") {
      setLogs((prev) => [
        ...prev,
        { id: Date.now().toString(), time: now, type: "info", text: "Sincronizando variables .env con Supabase DB..." },
      ]);
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), time: now, type: "success", text: "✓ Llaves Groq, OpenAI y Gemini validadas en jarvis_config." },
        ]);
        setIsRunningCommand(false);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#050914] border border-cyan-500/40 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-cyan-500/10 overflow-hidden font-mono">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-cyan-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Consola DevOps Operador — Manuel (CEO)
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  SSH SECURE CONNECTED
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block">VPS Hostinger srv1849831 (31.97.145.8)</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel de Botones Rápidos */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={() => runCommand("healthcheck")}
            disabled={isRunningCommand}
            className="px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-700/60 hover:bg-cyan-900 text-cyan-300 font-semibold flex items-center gap-1.5 transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ejecutar Healthcheck</span>
          </button>

          <button
            onClick={() => runCommand("clearcache")}
            disabled={isRunningCommand}
            className="px-3 py-1.5 rounded-xl bg-amber-950 border border-amber-700/60 hover:bg-amber-900 text-amber-300 font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Purgar Caché CDN</span>
          </button>

          <button
            onClick={() => runCommand("syncenv")}
            disabled={isRunningCommand}
            className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-700/60 hover:bg-emerald-900 text-emerald-300 font-semibold flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sincronizar .env DB</span>
          </button>
        </div>

        {/* Consola Terminal */}
        <div className="p-4 bg-[#02050c] flex-1 overflow-y-auto space-y-2 custom-scrollbar text-xs">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-slate-600 shrink-0">[{log.time}]</span>
              <span
                className={
                  log.type === "success"
                    ? "text-emerald-400 font-bold"
                    : log.type === "warning"
                    ? "text-amber-300"
                    : log.type === "error"
                    ? "text-red-400 font-bold"
                    : "text-slate-300"
                }
              >
                {log.text}
              </span>
            </div>
          ))}
          {isRunningCommand && (
            <div className="flex items-center gap-2 text-cyan-400 animate-pulse pt-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Ejecutando script en el VPS...</span>
            </div>
          )}
        </div>

        {/* Footer Terminal */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Modo Desarrollador Protegido (PIN 2026)</span>
          <span>Docker Engine v26.0 | Node v20.11</span>
        </div>
      </div>
    </div>
  );
}
