"use client";

import React, { useEffect, useRef, useState } from "react";
import { Brain, Sparkles, Zap, Maximize2, Minimize2, Eye, EyeOff, ShieldCheck, Activity, Cpu } from "lucide-react";

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  sublabel: string;
  category: "vps" | "rag" | "ai" | "user" | "dian";
  similarity: number;
  active: boolean;
  glowProgress: number;
}

interface Edge {
  source: number;
  target: number;
  weight: number;
  active: boolean;
  pulsePos: number;
  pulseSpeed: number;
}

interface MemoryNeuralNetworkProps {
  isActive?: boolean;
  isCompact?: boolean;
  activeQuery?: string;
  onClose?: () => void;
}

const MEMORY_NODES_DATA = [
  { label: "VPS Hostinger", sublabel: "IP: 31.97.145.8", category: "vps" },
  { label: "Groq Llama 3.3", sublabel: "70B Versatile SSE", category: "ai" },
  { label: "OpenAI GPT-4o", sublabel: "Vision Multimodal", category: "ai" },
  { label: "Supabase Vector", sublabel: "pgvector HNSW (1536-d)", category: "rag" },
  { label: "Next.js 15 Core", sublabel: "App Router :3080", category: "vps" },
  { label: "Flask AI Engine", sublabel: "Python Core :5000", category: "vps" },
  { label: "Dr. Walther Parrado", sublabel: "Perfil Director Jowhalth", category: "user" },
  { label: "Manuel Madrid CEO", sublabel: "Tech Lead & Devops", category: "user" },
  { label: "Nginx Proxy Mgr", sublabel: "SSL & Reverse Proxy :81", category: "vps" },
  { label: "DIAN UBL 2.1", sublabel: "Firmador Factura Electrónica", category: "dian" },
  { label: "WhatsApp Meta API", sublabel: "Bot Agent Handler", category: "rag" },
  { label: "Jowhalth Academy", sublabel: "Cursos & Alumnos DB", category: "user" },
  { label: "Gemini 1.5 Flash", sublabel: "Multimodal Vision SSE", category: "ai" },
  { label: "Similitud Coseno", sublabel: "Match > 0.85 Threshold", category: "rag" },
  { label: "Prompts Sistema", sublabel: "Contexto Corporativo JyM", category: "rag" },
];

const CATEGORY_COLORS: Record<string, { main: string; glow: string; bg: string }> = {
  vps: { main: "#3b82f6", glow: "#60a5fa", bg: "rgba(59, 130, 246, 0.15)" },
  rag: { main: "#06b6d4", glow: "#22d3ee", bg: "rgba(6, 182, 212, 0.15)" },
  ai: { main: "#a855f7", glow: "#c084fc", bg: "rgba(168, 85, 247, 0.15)" },
  user: { main: "#10b981", glow: "#34d399", bg: "rgba(16, 185, 129, 0.15)" },
  dian: { main: "#f59e0b", glow: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)" },
};

export default function MemoryNeuralNetwork({
  isActive = false,
  isCompact = false,
  activeQuery = "",
  onClose,
}: MemoryNeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [activeMemoryCount, setActiveMemoryCount] = useState(7);
  const [similarityMatch, setSimilarityMatch] = useState<string>("94.8%");
  const [lastActivated, setLastActivated] = useState<string>("Búsqueda de Similitud Vectorial Inactiva");

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Inicializar red neuronal con coordenadas distribuidas por la cuadrícula
  useEffect(() => {
    const nodes: Node[] = MEMORY_NODES_DATA.map((concept, idx) => ({
      id: idx,
      x: 60 + (idx % 5) * 160 + (Math.random() - 0.5) * 30,
      y: 50 + Math.floor(idx / 5) * 75 + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 6,
      label: concept.label,
      sublabel: concept.sublabel,
      category: concept.category as any,
      similarity: Number((Math.random() * 0.15 + 0.83).toFixed(3)),
      active: false,
      glowProgress: 0,
    }));

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 190) {
          edges.push({
            source: i,
            target: j,
            weight: Math.random() * 0.7 + 0.3,
            active: false,
            pulsePos: Math.random(),
            pulseSpeed: Math.random() * 0.01 + 0.008,
          });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, []);

  // Activar nodos en tiempo real cuando hay consulta o streaming activo
  useEffect(() => {
    if (isActive) {
      const activeIndices = new Set<number>();
      while (activeIndices.size < Math.min(8, nodesRef.current.length)) {
        activeIndices.add(Math.floor(Math.random() * nodesRef.current.length));
      }

      nodesRef.current.forEach((n, idx) => {
        if (activeIndices.has(idx)) {
          n.active = true;
          n.glowProgress = 1;
          n.similarity = Number((Math.random() * 0.08 + 0.91).toFixed(3));
        }
      });

      edgesRef.current.forEach((e) => {
        if (activeIndices.has(e.source) || activeIndices.has(e.target)) {
          e.active = true;
        }
      });

      setActiveMemoryCount(activeIndices.size);
      const matchScore = (Math.random() * 4 + 95).toFixed(1);
      setSimilarityMatch(`${matchScore}%`);
      setLastActivated(
        activeQuery ? `Procesando Vector: "${activeQuery.slice(0, 30)}..."` : "RAG Vector Matching Activo"
      );
    } else {
      const timer = setTimeout(() => {
        nodesRef.current.forEach((n) => {
          n.active = false;
        });
        edgesRef.current.forEach((e) => {
          e.active = false;
        });
        setActiveMemoryCount(4);
        setLastActivated("Standby Vectorial — Listo para Consultas");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, activeQuery]);

  // Bucle de renderizado Canvas 2D Cyberpunk
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = isExpanded ? 460 : 250;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Movimiento suave con límites
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 40 || n.x > canvas.width - 140) n.vx *= -1;
        if (n.y < 30 || n.y > canvas.height - 30) n.vy *= -1;

        if (n.glowProgress > 0) {
          n.glowProgress = Math.max(0, n.glowProgress - 0.004);
        }
      });

      // 1. Dibujar conexiones (sinapsis)
      edges.forEach((e) => {
        const source = nodes[e.source];
        const target = nodes[e.target];

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        const isActiveEdge = e.active || source.active || target.active;

        if (isActiveEdge) {
          ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
          ctx.lineWidth = 1.6;

          // Pulso de datos viajando por la fibra óptica
          e.pulsePos = (e.pulsePos + e.pulseSpeed) % 1;
          const px = source.x + (target.x - source.x) * e.pulsePos;
          const py = source.y + (target.y - source.y) * e.pulsePos;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.strokeStyle = "rgba(30, 41, 59, 0.3)";
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      });

      // 2. Dibujar Nodos y Etiquetas visibles SIEMPRE
      nodes.forEach((n) => {
        const color = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.rag;

        // Resplandor exterior (Aura)
        ctx.save();
        if (n.active || n.glowProgress > 0) {
          const auraRad = n.radius * 3.5;
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, auraRad);
          grad.addColorStop(0, color.glow);
          grad.addColorStop(1, "transparent");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, auraRad, 0, Math.PI * 2);
          ctx.fill();
        }

        // Núcleo del nodo
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.active ? "#ffffff" : color.main;
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = n.active ? 12 : 4;
        ctx.fill();
        ctx.restore();

        // ETIQUETA VISIBLE SIEMPRE (Título principal del nodo)
        ctx.save();
        ctx.font = n.active ? "bold 11px Outfit, sans-serif" : "10px Outfit, sans-serif";
        ctx.fillStyle = n.active ? "#ffffff" : "#cbd5e1";
        ctx.shadowColor = n.active ? color.glow : "rgba(0,0,0,0.8)";
        ctx.shadowBlur = n.active ? 8 : 2;
        ctx.fillText(n.label, n.x + 12, n.y + 3);

        // Sub-etiqueta secundaria en color cyan/slate
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = n.active ? color.glow : "#64748b";
        ctx.shadowBlur = 0;
        ctx.fillText(n.sublabel, n.x + 12, n.y + 14);

        // Score de similitud para nodos activos
        if (n.active) {
          ctx.font = "bold 8px JetBrains Mono, monospace";
          ctx.fillStyle = "#10b981";
          ctx.fillText(`sim:${n.similarity}`, n.x + 12, n.y - 6);
        }
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [isExpanded]);

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 relative overflow-hidden backdrop-blur-xl shadow-2xl ${
        isExpanded ? "h-[500px]" : isCompact ? "h-[200px]" : "h-[290px]"
      } bg-[#060a17]/95 border-cyan-500/30 hover:border-cyan-500/60`}
    >
      {/* Fondo Retícula Neón Cyberpunk */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header de Telemetría RAG en tiempo real */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-cyan-950/80 flex items-center justify-between z-20 relative backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-cyan-950/90 border border-cyan-500/40 text-cyan-400">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
                Red Neuronal de Memoria RAG
              </span>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                  isActive
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/40 animate-pulse"
                    : "bg-cyan-950 text-cyan-400 border-cyan-800/40"
                }`}
              >
                {isActive ? "Búsqueda Vectorial Activa" : "STANDBY RAG"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">{lastActivated}</span>
          </div>
        </div>

        {/* Métricas Vectoriales */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">Similitud Vectorial:</span>
            <span className="text-cyan-300 font-bold">{similarityMatch}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">Nodos RAG:</span>
            <span className="text-emerald-400 font-bold">
              {activeMemoryCount} / {MEMORY_NODES_DATA.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
              title={isExpanded ? "Reducir tamaño" : "Expandir vista"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                title="Ocultar visualizador"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas 2D Interactivo */}
      <canvas ref={canvasRef} className="w-full h-full block relative z-10" />

      {/* Leyenda de Nodos en la parte inferior */}
      <div className="absolute bottom-2 left-4 z-20 flex items-center gap-3 text-[10px] font-mono bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <span className="flex items-center gap-1 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> VPS Hostinger
        </span>
        <span className="flex items-center gap-1 text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Supabase RAG
        </span>
        <span className="flex items-center gap-1 text-purple-400">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> LLM Engines
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Dr. Walther / Manuel
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> DIAN Signer
        </span>
      </div>
    </div>
  );
}
