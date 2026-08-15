"use client";

import React, { useEffect, useRef } from "react";
import {
  BarChart3,
  Server,
  MessageSquare,
  Plus,
  Download,
  Image as ImageIcon,
  Mic,
  Zap,
  Terminal,
  Calendar,
  Bot,
} from "lucide-react";

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt?: string;
  action?: "clear" | "export" | "image" | "voice";
}

const COMMANDS: SlashCommand[] = [
  {
    command: "/briefing",
    label: "Daily Briefing Ejecutivo",
    description: "Resumen matutino integral de tareas, métricas y estado del VPS para el Dr. Walther",
    icon: <Calendar className="w-4 h-4 text-emerald-400" />,
    prompt: "Generar un Daily Briefing Ejecutivo matutino de 360 grados para el Dr. Walther Parrado: 1. Resumen de estado de Jowhalth Academy. 2. Estado de salud de la infraestructura VPS (31.97.145.8). 3. Tareas estratégicas del día y agentes de IA activos.",
  },
  {
    command: "/reporte",
    label: "Reporte Ejecutivo",
    description: "Genera reporte integral del Ecosistema Digital de Walther Parrado",
    icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
    prompt: "Generar un reporte ejecutivo integral del Ecosistema Digital y la plataforma Jowhalth Academy para el Dr. Walther Parrado. Incluir estado de proyectos, KPIs y próximos pasos estratégicos.",
  },
  {
    command: "/infra",
    label: "Estado de Infraestructura",
    description: "Resumen del VPS 31.97.145.8 y plataformas en producción",
    icon: <Server className="w-4 h-4 text-blue-400" />,
    prompt: "Proporcionar un resumen ejecutivo completo de la infraestructura activa del VPS 31.97.145.8: servicios Docker en ejecución, estado del Flask AI Engine :5000, Supabase :8000, Nginx Proxy Manager :81 y JARVIS Platform :3080.",
  },
  {
    command: "/zetugc",
    label: "Estado zetugc.com",
    description: "Resumen del proyecto UGC y automatizaciones n8n",
    icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
    prompt: "Resumir el estado actual del proyecto zetugc.com: automatizaciones activas en n8n, contenido UGC en producción y próximos pasos.",
  },
  {
    command: "/nuevo",
    label: "Nueva Conversación",
    description: "Limpia el chat e inicia un hilo fresco",
    icon: <Plus className="w-4 h-4 text-violet-400" />,
    action: "clear",
  },
  {
    command: "/exportar",
    label: "Exportar Conversación",
    description: "Descarga el historial como Markdown o PDF",
    icon: <Download className="w-4 h-4 text-amber-400" />,
    action: "export",
  },
  {
    command: "/imagen",
    label: "Modo Visión",
    description: "Activa el análisis de imágenes con Groq Vision / GPT-4o",
    icon: <ImageIcon className="w-4 h-4 text-pink-400" />,
    action: "image",
  },
  {
    command: "/voz",
    label: "Activar Dictado",
    description: "Activa el micrófono para dictar por voz",
    icon: <Mic className="w-4 h-4 text-red-400" />,
    action: "voice",
  },
  {
    command: "/jowhalth",
    label: "Estado Jowhalth Academy",
    description: "Consulta el estado de la plataforma educativa",
    icon: <Zap className="w-4 h-4 text-yellow-400" />,
    prompt: "Proporcionar un resumen completo del estado actual de Jowhalth Academy: plataforma PocketBase en srv888548.hstgr.cloud, módulos activos, base de estudiantes y próximas integraciones de pago con Wompi.",
  },
  {
    command: "/rentun",
    label: "Estado Rentun Group",
    description: "Resumen del ecosistema comercial Rentun Group",
    icon: <Terminal className="w-4 h-4 text-orange-400" />,
    prompt: "Resumir el estado actual de Rentun Group dentro del ecosistema digital del Dr. Walther Parrado.",
  },
  {
    command: "/agentes",
    label: "Red de Agentes IA",
    description: "Monitoreo del ecosistema de Agentes IA corporativos",
    icon: <Bot className="w-4 h-4 text-cyan-400" />,
    prompt: "Proporcionar un informe sobre el estado del Ecosistema Digital del Dr. Walther Parrado: waltherparrado.com, jarvis.waltherparrado.com, Jowhalth Academy, zetugc.com y Rentun Group.",
  },
  {
    command: "/devops",
    label: "Consola DevOps Operador",
    description: "Acceso a diagnóstico SSH y contenedores Docker (Manuel)",
    icon: <Terminal className="w-4 h-4 text-emerald-400" />,
    prompt: "Generar reporte de telemetría de desarrollo y estado DevOps para Manuel (CEO & Tech Lead): contenedores Docker, latencia, memoria RAM del VPS 31.97.145.8 y estado del motor Flask.",
  },
];

interface SlashCommandMenuProps {
  query: string;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filtered = COMMANDS.filter(
    (c) =>
      c.command.includes(query.toLowerCase()) ||
      c.label.toLowerCase().includes(query.toLowerCase().replace("/", ""))
  );

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900/98 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/50 z-50 animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Header del menú */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Comandos JARVIS
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {filtered.length} disponibles · ESC para cerrar
        </span>
      </div>

      {/* Lista de comandos */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
        {filtered.map((cmd) => (
          <button
            key={cmd.command}
            onClick={() => onSelect(cmd)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-950/40 transition-all text-left group"
          >
            {/* Icono */}
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:border-cyan-500/40 flex items-center justify-center shrink-0 transition-colors">
              {cmd.icon}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {cmd.command}
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {cmd.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {cmd.description}
              </p>
            </div>

            {/* Badge acción */}
            {cmd.action && (
              <span className="text-[9px] font-mono bg-violet-950 border border-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded shrink-0">
                {cmd.action.toUpperCase()}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
