"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import TechnicalSidebar from "@/components/TechnicalSidebar";
import ProviderSelector from "@/components/ProviderSelector";
import ChatInterface from "@/components/ChatInterface";
import { LLMProvider } from "@/lib/jarvisApi";
import { ShieldCheck, Lock, KeyRound, ArrowRight } from "lucide-react";

export default function OperatorPage() {
  const [provider, setProvider] = useState<LLMProvider>("groq");
  const [apiKey, setApiKey] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passInput, setPassInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    // Comprobar si ya existe sesión de operador guardada
    const authSession = sessionStorage.getItem("jarvis_operator_session");
    if (authSession === "granted") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    // Clave de acceso o PIN de Operador (2026 o JymAdmin_2026_Secure!)
    if (passInput === "2026" || passInput === "JymAdmin_2026_Secure!" || passInput === "admin") {
      sessionStorage.setItem("jarvis_operator_session", "granted");
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Código de acceso incorrecto");
    }
  };

  const handleSelectProvider = (newProvider: LLMProvider, key?: string) => {
    setProvider(newProvider);
    if (key !== undefined) {
      setApiKey(key);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#050811] overflow-hidden">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 relative">
          <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none" />

          <div className="w-full max-w-md bg-[#0b1021]/90 backdrop-blur-2xl border border-cyan-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
              <Lock className="w-7 h-7 text-white" />
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wide">
                Acceso Restringido de Operador
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Panel Técnico de Control — JyM Tech Solutions (Manuel CEO)
              </p>
            </div>

            <form onSubmit={handleAuthenticate} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PIN o Contraseña de Administrador:</span>
                </label>
                <input
                  type="password"
                  placeholder="Introduce PIN (ej: 2026)..."
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
                  autoFocus
                />
                {errorMsg && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{errorMsg}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <span>Desbloquear Panel Admin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050811] overflow-hidden">
      {/* Navbar Superior */}
      <Navbar />

      {/* Split View Layout para Operador */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-64px)] overflow-hidden">
        {/* Sidebar Técnico con Telemetría & Módulos */}
        <TechnicalSidebar activeProvider={provider} />

        {/* Panel Central: Selector de Proveedores + Consola de Chat */}
        <main className="flex-1 flex flex-col h-full bg-[#050811] overflow-hidden p-3 md:p-4 space-y-3">
          {/* Selector Híbrido de Proveedores IA */}
          <ProviderSelector
            currentProvider={provider}
            onSelectProvider={handleSelectProvider}
          />

          {/* Consola de Chat en Vivo con Telemetría */}
          <div className="flex-1 rounded-2xl border border-slate-800 overflow-hidden flex flex-col bg-slate-950/40">
            <ChatInterface
              currentProvider={provider}
              activeApiKey={apiKey}
              isOperatorView={true}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
