"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import TechnicalSidebar from "@/components/TechnicalSidebar";
import ProviderSelector from "@/components/ProviderSelector";
import ChatInterface from "@/components/ChatInterface";
import { LLMProvider } from "@/lib/jarvisApi";

export default function OperatorPage() {
  const [provider, setProvider] = useState<LLMProvider>("groq");
  const [apiKey, setApiKey] = useState<string>("");

  const handleSelectProvider = (newProvider: LLMProvider, key?: string) => {
    setProvider(newProvider);
    if (key !== undefined) {
      setApiKey(key);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050811] overflow-hidden">
      {/* Navbar Superior */}
      <Navbar />

      {/* Split View Layout para Operador */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
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
