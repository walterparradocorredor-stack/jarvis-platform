"use client";

import React, { useState, useEffect } from "react";
import { Brain, Search, Plus, Trash2, X, Check, Database, Sparkles, RefreshCw } from "lucide-react";

interface MemoryItem {
  id: string;
  topic: string;
  content: string;
  category: "contexto" | "empresa" | "academico" | "sistema";
  timestamp: string;
}

interface MemoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: "mem-1",
    topic: "Dr. Walther Parrado - Perfil Principal",
    content: "Empresario, Ingeniero Electrónico, Magíster en Educación, Doctor en Gerencia Educativa. Director de Jowhalth Academy.",
    category: "contexto",
    timestamp: "2026-08-08",
  },
  {
    id: "mem-2",
    topic: "zetugc.com",
    content: "Proyecto de contenido UGC y automatizaciones n8n del ecosistema digital del Dr. Walther Parrado.",
    category: "empresa",
    timestamp: "2026-08-08",
  },
  {
    id: "mem-3",
    topic: "Rentun Group",
    content: "Ecosistema comercial Rentun Group, parte del portafolio de proyectos del Dr. Walther Parrado.",
    category: "sistema",
    timestamp: "2026-08-08",
  },
  {
    id: "mem-4",
    topic: "Jowhalth Academy - Plataforma Educativa",
    content: "Cursos y programas ejecutivos, integración de pagos con Wompi.",
    category: "academico",
    timestamp: "2026-08-08",
  },
];

export default function MemoryManagerModal({ isOpen, onClose }: MemoryManagerModalProps) {
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryItem["category"]>("contexto");
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newContent.trim()) return;

    const newItem: MemoryItem = {
      id: `mem-${Date.now()}`,
      topic: newTopic.trim(),
      content: newContent.trim(),
      category: newCategory,
      timestamp: new Date().toISOString().split("T")[0],
    };

    setMemories([newItem, ...memories]);
    setNewTopic("");
    setNewContent("");
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setMemories(memories.filter((m) => m.id !== id));
  };

  const filteredMemories = memories.filter(
    (m) =>
      m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#090d1f] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-cyan-950/80 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Gestor de Memoria Vectorial RAG
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Supabase pgvector (1536-dim)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Inspeccione y administre el conocimiento persistente guardado en la plataforma JARVIS.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador & Acciones */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/40">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en la memoria RAG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? "Cancelar" : "Nueva Memoria"}</span>
          </button>
        </div>

        {/* Formulario Agregar Memoria */}
        {isAdding && (
          <form onSubmit={handleAddMemory} className="p-4 border-b border-cyan-900/50 bg-cyan-950/20 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Título del concepto (ej: Convenio Alianza Jowhalth)"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-cyan-500"
                required
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-cyan-500"
              >
                <option value="contexto">Contexto Walther Parrado</option>
                <option value="empresa">Ecosistema Digital</option>
                <option value="academico">Jowhalth Academy</option>
                <option value="sistema">Sistema & Infraestructura</option>
              </select>
            </div>
            <textarea
              placeholder="Contenido o regla de contexto para la memoria RAG..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-cyan-500 resize-none"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Vector RAG</span>
              </button>
            </div>
          </form>
        )}

        {/* Lista de Memorias */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No se encontraron vectores de memoria coincidentes.
            </div>
          ) : (
            filteredMemories.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all group relative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">{item.topic}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 uppercase">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">{item.timestamp}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Eliminar registro RAG"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-mono leading-relaxed">{item.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Aprendizaje Persistente Activo</span>
          </div>
          <span>Total Vectores: {memories.length}</span>
        </div>
      </div>
    </div>
  );
}
