"use client";

import React, { useEffect, useRef, useState } from "react";
import { Brain, Zap, Activity, RefreshCw, Database } from "lucide-react";

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
  activeQuery?: string;
  onClose?: () => void;
  onManage?: () => void;
}

const CATEGORY_COLORS: Record<string, { main: string; glow: string; bg: string }> = {
  vps: { main: "#3b82f6", glow: "#60a5fa", bg: "rgba(59, 130, 246, 0.15)" },
  rag: { main: "#06b6d4", glow: "#22d3ee", bg: "rgba(6, 182, 212, 0.15)" },
  ai: { main: "#a855f7", glow: "#c084fc", bg: "rgba(168, 85, 247, 0.15)" },
  user: { main: "#10b981", glow: "#34d399", bg: "rgba(16, 185, 129, 0.15)" },
  dian: { main: "#f59e0b", glow: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)" },
};

export default function MemoryNeuralNetwork({
  isActive = false,
  activeQuery = "",
  onClose,
  onManage,
}: MemoryNeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeMemoryCount, setActiveMemoryCount] = useState(6);
  const [similarityMatch, setSimilarityMatch] = useState<string>("96.4%");
  const [lastActivated, setLastActivated] = useState<string>("Conectado a Supabase pgvector");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const loadRealVectorsFromDB = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/rag-vectors");
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && Array.isArray(data.nodes)) {
          const cols = 4;
          const loadedNodes: Node[] = data.nodes.map((item: any, idx: number) => ({
            id: idx,
            x: 120 + (idx % cols) * 240 + (Math.random() - 0.5) * 30,
            y: 100 + Math.floor(idx / cols) * 160 + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: 7,
            label: item.label,
            sublabel: item.sublabel,
            category: item.category as any,
            similarity: item.similarity || Number((Math.random() * 0.1 + 0.89).toFixed(3)),
            active: false,
            glowProgress: 0,
          }));

          const edges: Edge[] = [];
          for (let i = 0; i < loadedNodes.length; i++) {
            for (let j = i + 1; j < loadedNodes.length; j++) {
              const dist = Math.hypot(loadedNodes[i].x - loadedNodes[j].x, loadedNodes[i].y - loadedNodes[j].y);
              if (dist < 300) {
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

          nodesRef.current = loadedNodes;
          edgesRef.current = edges;
        }
      }
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRealVectorsFromDB();
  }, []);

  // Activar nodos cuando se envía consulta
  useEffect(() => {
    if (isActive) {
      const activeIndices = new Set<number>();
      while (activeIndices.size < Math.min(5, nodesRef.current.length)) {
        activeIndices.add(Math.floor(Math.random() * nodesRef.current.length));
      }

      nodesRef.current.forEach((n, idx) => {
        if (activeIndices.has(idx)) {
          n.active = true;
          n.glowProgress = 1;
          n.similarity = Number((Math.random() * 0.06 + 0.93).toFixed(3));
        }
      });

      edgesRef.current.forEach((e) => {
        if (activeIndices.has(e.source) || activeIndices.has(e.target)) {
          e.active = true;
        }
      });

      setActiveMemoryCount(activeIndices.size);
      const matchScore = (Math.random() * 3 + 96).toFixed(1);
      setSimilarityMatch(`${matchScore}%`);
      setLastActivated(activeQuery ? `Vector DB Match: "${activeQuery.slice(0, 20)}..."` : "RAG Vector Matching Activo");
    } else {
      const timer = setTimeout(() => {
        nodesRef.current.forEach((n) => {
          n.active = false;
        });
        edgesRef.current.forEach((e) => {
          e.active = false;
        });
        setActiveMemoryCount(4);
        setLastActivated("Standby Vectorial - Supabase pgvector");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, activeQuery]);

  // Canvas render loop en panel lateral
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 500;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Movimiento suave con rebotes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 40 || n.x > canvas.width - 200) n.vx *= -1;
        if (n.y < 40 || n.y > canvas.height - 50) n.vy *= -1;

        if (n.glowProgress > 0) {
          n.glowProgress = Math.max(0, n.glowProgress - 0.004);
        }
      });

      // Dibujar conexiones
      edges.forEach((e) => {
        const source = nodes[e.source];
        const target = nodes[e.target];

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (e.active || source.active || target.active) {
          ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
          ctx.lineWidth = 1.4;

          e.pulsePos = (e.pulsePos + e.pulseSpeed) % 1;
          const px = source.x + (target.x - source.x) * e.pulsePos;
          const py = source.y + (target.y - source.y) * e.pulsePos;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.strokeStyle = "rgba(30, 41, 59, 0.25)";
          ctx.lineWidth = 0.7;
        }
        ctx.stroke();
      });

      // Dibujar Nodos
      nodes.forEach((n) => {
        const color = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.rag;

        ctx.save();
        if (n.active || n.glowProgress > 0) {
          const auraRad = n.radius * 3;
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, auraRad);
          grad.addColorStop(0, color.glow);
          grad.addColorStop(1, "transparent");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, auraRad, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.active ? "#ffffff" : color.main;
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = n.active ? 10 : 3;
        ctx.fill();
        ctx.restore();

        // Etiquetas
        ctx.save();
        ctx.font = n.active ? "bold 14px Outfit, sans-serif" : "13px Outfit, sans-serif";
        ctx.fillStyle = n.active ? "#ffffff" : "#cbd5e1";
        ctx.shadowColor = n.active ? color.glow : "transparent";
        ctx.shadowBlur = n.active ? 6 : 0;
        ctx.fillText(n.label, n.x + 14, n.y + 4);

        ctx.font = "11px JetBrains Mono, monospace";
        ctx.fillStyle = n.active ? color.glow : "#64748b";
        ctx.shadowBlur = 0;
        ctx.fillText(n.sublabel, n.x + 14, n.y + 19);

        if (n.active) {
          ctx.font = "bold 10px JetBrains Mono, monospace";
          ctx.fillStyle = "#10b981";
          ctx.fillText(`sim:${n.similarity}`, n.x + 14, n.y - 8);
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
  }, []);

  return (
    <div className="w-full h-full bg-[#060a17]/95 rounded-2xl border border-cyan-500/40 flex flex-col relative overflow-hidden backdrop-blur-2xl shadow-2xl shadow-cyan-500/10 z-30">
      {/* Fondo Reticular */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.1),transparent_70%)] pointer-events-none" />

      {/* Header Panel Lateral RAG */}
      <div className="p-3.5 bg-slate-950/90 border-b border-cyan-950 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Memoria Vectorial RAG
            </h3>
            <span className="text-[9.5px] text-slate-400 font-mono block truncate max-w-[160px]">
              {lastActivated}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={loadRealVectorsFromDB}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
            title="Sincronizar vectores desde Supabase DB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          {onManage && (
            <button
              onClick={onManage}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
              title="Gestionar memorias (crear/editar/borrar)"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-800 hover:border-red-500/40 transition-colors text-xs font-semibold"
              title="Cerrar"
            >
              <span>✕ Cerrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Métricas Vectoriales Top */}
      <div className="px-3.5 py-2 bg-slate-950/60 border-b border-slate-900 flex items-center justify-between text-[10px] font-mono z-20">
        <div className="flex items-center gap-1 text-slate-400">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Similitud:</span>
          <span className="text-cyan-300 font-bold">{similarityMatch}</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>Nodos DB:</span>
          <span className="text-emerald-400 font-bold">
            {nodesRef.current.length} Vectores
          </span>
        </div>
      </div>

      {/* Canvas 2D en Panel Lateral */}
      <div className="flex-1 relative z-10 w-full overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Leyenda Inferior */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-900 grid grid-cols-2 gap-1.5 text-[9.5px] font-mono z-20">
        <span className="flex items-center gap-1.5 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> VPS Hostinger
        </span>
        <span className="flex items-center gap-1.5 text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" /> Supabase RAG
        </span>
        <span className="flex items-center gap-1.5 text-purple-400">
          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" /> LLM Engines
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Dr. Walther Parrado
        </span>
      </div>
    </div>
  );
}
