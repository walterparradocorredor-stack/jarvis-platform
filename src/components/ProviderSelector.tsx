"use client";

import React, { useState, useEffect } from "react";
import { Zap, Key, Server, Cpu, CheckCircle2, ShieldAlert } from "lucide-react";
import { LLMProvider } from "@/lib/jarvisApi";
import { supabase } from "@/lib/supabase";

interface ProviderSelectorProps {
  currentProvider: LLMProvider;
  onSelectProvider: (provider: LLMProvider, key?: string) => void;
}

export default function ProviderSelector({
  currentProvider,
  onSelectProvider,
}: ProviderSelectorProps) {
  const [groqKey, setGroqKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    // 1. Cargar respaldos de localStorage primero
    const savedGroq = localStorage.getItem("jarvis_groq_key") || "";
    const savedOpenAI = localStorage.getItem("jarvis_openai_key") || "";
    const savedGemini = localStorage.getItem("jarvis_gemini_key") || "";
    setGroqKey(savedGroq);
    setOpenaiKey(savedOpenAI);
    setGeminiKey(savedGemini);

    const savedProvider = localStorage.getItem("jarvis_active_provider") as LLMProvider;
    if (savedProvider) {
      onSelectProvider(savedProvider);
    }

    // 2. Cargar configuraciones centrales desde la base de datos Supabase del VPS
    supabase
      .from("cms_content")
      .select("content")
      .eq("id", "jarvis_config")
      .single()
      .then(({ data }) => {
        if (data?.content) {
          const c = data.content;
          if (c.groqKey) setGroqKey(c.groqKey);
          if (c.openaiKey) setOpenaiKey(c.openaiKey);
          if (c.geminiKey) setGeminiKey(c.geminiKey);

          if (c.activeProvider) {
            let key = "";
            if (c.activeProvider === "groq") key = c.groqKey || savedGroq;
            if (c.activeProvider === "openai") key = c.openaiKey || savedOpenAI;
            if (c.activeProvider === "gemini") key = c.geminiKey || savedGemini;
            onSelectProvider(c.activeProvider as LLMProvider, key);
          }
        }
      });
  }, []);

  const getActiveKey = (p: LLMProvider) => {
    if (p === "groq") return groqKey;
    if (p === "openai") return openaiKey;
    if (p === "gemini") return geminiKey;
    return "";
  };

  const handleSelect = (p: LLMProvider) => {
    localStorage.setItem("jarvis_active_provider", p);
    onSelectProvider(p, getActiveKey(p));

    // Guardar selección centralizada en la BD Supabase del VPS
    supabase
      .from("cms_content")
      .update({
        content: {
          activeProvider: p,
          groqKey,
          openaiKey,
          geminiKey,
        },
      })
      .eq("id", "jarvis_config")
      .then();
  };

  const handleSaveKey = (provider: LLMProvider, value: string) => {
    let newGroq = groqKey;
    let newOpenAI = openaiKey;
    let newGemini = geminiKey;

    if (provider === "groq") {
      newGroq = value;
      setGroqKey(value);
      localStorage.setItem("jarvis_groq_key", value);
    } else if (provider === "openai") {
      newOpenAI = value;
      setOpenaiKey(value);
      localStorage.setItem("jarvis_openai_key", value);
    } else if (provider === "gemini") {
      newGemini = value;
      setGeminiKey(value);
      localStorage.setItem("jarvis_gemini_key", value);
    }

    // Persistir todo centralizado en Supabase BD
    supabase
      .from("cms_content")
      .update({
        content: {
          activeProvider: provider,
          groqKey: newGroq,
          openaiKey: newOpenAI,
          geminiKey: newGemini,
        },
      })
      .eq("id", "jarvis_config")
      .then();

    handleSelect(provider);
  };

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Motor de Inteligencia & Cascadas Híbridas
          </h3>
        </div>
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          <Key className="w-3 h-3" />
          <span>{showKeyInput ? "Ocultar Keys" : "Configurar API Keys"}</span>
        </button>
      </div>

      {/* Grid de Proveedores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* GROQ */}
        <button
          onClick={() => handleSelect("groq")}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            currentProvider === "groq"
              ? "bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-cyan-400">Groq API</span>
            <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
              0% RAM VPS
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Llama 3.3 70B Ultra Rápido</p>
        </button>

        {/* OPENAI */}
        <button
          onClick={() => handleSelect("openai")}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            currentProvider === "openai"
              ? "bg-blue-950/60 border-blue-500 text-white shadow-lg shadow-blue-500/10"
              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-blue-400">OpenAI</span>
            <span className="text-[9px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-mono">
              Cloud
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">GPT-4o / GPT-4o-mini</p>
        </button>

        {/* GEMINI */}
        <button
          onClick={() => handleSelect("gemini")}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            currentProvider === "gemini"
              ? "bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-indigo-400">Gemini</span>
            <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
              Cloud
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Gemini 1.5 Flash / Pro</p>
        </button>

        {/* LOCAL LLAMA 3.1 */}
        <button
          onClick={() => handleSelect("local")}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            currentProvider === "local"
              ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-500/10"
              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-purple-400">Llama 3.1</span>
            <span className="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded font-mono">
              VPS :5000
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Motor Embebido Respaldo</p>
        </button>
      </div>

      {/* Input de API Keys desplegable */}
      {showKeyInput && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-[11px] text-slate-300 mb-1 font-mono">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>Configurar API Keys (Sincronizado con Supabase BD VPS):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-cyan-400 font-semibold uppercase block mb-1">
                Groq API Key
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => handleSaveKey("groq", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-blue-400 font-semibold uppercase block mb-1">
                OpenAI Key
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => handleSaveKey("openai", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-indigo-400 font-semibold uppercase block mb-1">
                Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => handleSaveKey("gemini", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
