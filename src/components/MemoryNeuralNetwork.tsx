"use client";

import React, { useEffect, useRef, useState } from "react";
import { Brain, Sparkles, Zap, Maximize2, Minimize2, EyeOff } from "lucide-react";

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  category: "vps" | "rag" | "ai" | "user" | "dian";
  active: boolean;
  glowProgress: number;
}

interface Edge {
  source: number;
  target: number;
  weight: number;
  active: boolean;
  pulsePos: number;
}

interface MemoryNeuralNetworkProps {
  isActive?: boolean;
  isCompact?: boolean;
  activeQuery?: string;
  onClose?: () => void;
}

const MEMORY_CONCEPTS = [
  { label: "VPS 31.97.145.8", category: "vps" },
  { label: "Groq Llama 3.3 70B", category: "ai" },
  { label: "OpenAI GPT-4o", category: "ai" },
  { label: "Supabase Vector RAG", category: "rag" },
  { label: "Next.js Standalone :3080", category: "vps" },
  { label: "Flask API Engine :5000", category: "vps" },
  { label: "Dr. Walther Parrado Profile", category: "user" },
  { label: "Manuel Madrid CEO JyM", category: "user" },
  { label: "Nginx Proxy Manager :81", category: "vps" },
  { label: "DIAN UBL 2.1 Signer", category: "dian" },
  { label: "WhatsApp Meta API Engine", category: "rag" },
  { label: "Jowhalth Academy DB", category: "user" },
  { label: "Gemini 1.5 Pro Vision", category: "ai" },
  { label: "RAG Memory Cosine Match", category: "rag" },
  { label: "System Prompts JyM", category: "rag" },
];

export default function MemoryNeuralNetwork({
  isActive = false,
  isCompact = false,
  activeQuery = "",
  onClose,
}: MemoryNeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMemoryCount, setActiveMemoryCount] = useState(5);
  const [lastActivated, setLastActivated] = useState<string>("Búsqueda de Similitud Vectorial Inactiva");

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Inicializar red neuronal
  useEffect(() => {
    const nodes: Node[] = MEMORY_CONCEPTS.map((concept, idx) => ({
      id: idx,
      x: Math.random() * 600 + 50,
      y: Math.random() * 250 + 40,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 3 + 4,
      label: concept.label,
      category: concept.category as any,
      active: false,
      glowProgress: 0,
    }));

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 180 || Math.random() < 0.15) {
          edges.push({
            source: i,
            target: j,
            weight: Math.random() * 0.8 + 0.2,
            active: false,
            pulsePos: Math.random(),
          });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, []);

  // Activar nodos cuando se envía una consulta o JARVIS responde
  useEffect(() => {
    if (isActive) {
      const activeIndices = new Set<number>();
      while (activeIndices.size < Math.min(6, nodesRef.current.length)) {
        activeIndices.add(Math.floor(Math.random() * nodesRef.current.length));
      }

      nodesRef.current.forEach((n, idx) => {
        if (activeIndices.has(idx)) {
          n.active = true;
          n.glowProgress = 1;
        }
      });

      edgesRef.current.forEach((e) => {
        if (activeIndices.has(e.source) || activeIndices.has(e.target)) {
          e.active = true;
        }
      });

      setActiveMemoryCount(activeIndices.size);
      setLastActivated(
        activeQuery ? `Memoria Vectorial Activa: "${activeQuery.slice(0, 30)}..."` : "Sinapsis RAG Activada"
      );
    } else {
      const timer = setTimeout(() => {
        nodesRef.current.forEach((n) => {
          n.active = false;
        });
        edgesRef.current.forEach((e) => {
          e.active = false;
        });
        setActiveMemoryCount(0);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isActive, activeQuery]);

  // Bucle de animación en Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 280;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Actualizar posiciones de nodos con colisiones suaves
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 30 || n.x > canvas.width - 30) n.vx *= -1;
        if (n.y < 30 || n.y > canvas.height - 30) n.vy *= -1;

        if (n.glowProgress > 0) {
          n.glowProgress = Math.max(0, n.glowProgress - 0.005);
        }
      });

      // Dibujar Conexiones (Sinapsis)
      edges.forEach((e) => {
        const source = nodes[e.source];
        const target = nodes[e.target];

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (e.active || source.active || target.active) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.6)";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 8;

          // Pulso de luz viajando por la conexión
          e.pulsePos = (e.pulsePos + 0.015) % 1;
          const px = source.x + (target.x - source.x) * e.pulsePos;
          const py = source.y + (target.y - source.y) * e.pulsePos;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#22d3ee";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
          ctx.lineWidth = 0.8;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      });

      // Dibujar Nodos de Memoria
      nodes.forEach((n) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

        if (n.active || n.glowProgress > 0) {
          // Glow exterior
          const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 4);
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.9)");
          gradient.addColorStop(0.5, "rgba(16, 185, 129, 0.4)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0)");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 15;
        } else {
          ctx.fillStyle = n.category === "vps" ? "#3b82f6" : n.category === "rag" ? "#06b6d4" : "#64748b";
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Renderizar etiquetas en hover o si está activo
        if (n.active || isExpanded) {
          ctx.font = "10px Inter, sans-serif";
          ctx.fillStyle = n.active ? "#67e8f9" : "#94a3b8";
          ctx.shadowColor = n.active ? "#06b6d4" : "transparent";
          ctx.shadowBlur = n.active ? 6 : 0;
          ctx.fillText(n.label, n.x + 8, n.y + 3);
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isExpanded]);

  return (
    <div
      className={`relative bg-slate-950/90 border border-cyan-500/30 rounded-2xl overflow-hidden backdrop-blur-xl transition-all shadow-2xl shadow-cyan-950/30 ${
        isCompact ? "h-48" : isExpanded ? "h-[450px]" : "h-64"
      }`}
    >
      {/* Header HUD */}
      <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between z-20 border-b border-cyan-900/30">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              isActive
                ? "bg-cyan-950/80 border-cyan-400 text-cyan-400 animate-pulse shadow-lg shadow-cyan-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100">Red Neuronal de Memoria RAG</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                  isActive
                    ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {isActive ? "SINAPSIS ACTIVA" : "STANDBY"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-xs">{lastActivated}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 block">Nodos Conectados</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{activeMemoryCount} / 15 Vector Ref</span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title={isExpanded ? "Contraer visualizador" : "Expandir visualizador"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas 2D */}
      <canvas ref={canvasRef} className="w-full h-full relative z-10" />

      {/* Footer HUD */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800/80 backdrop-blur-md">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> VPS Hostinger
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Supabase RAG
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> LLM Engines
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
          <Zap className="w-3 h-3 text-cyan-400 animate-bounce" />
          <span>Vector Similarity Match</span>
        </div>
      </div>
    </div>
  );
}
