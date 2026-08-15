"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import JarvisHeader from "@/components/JarvisHeader";
import ChatInterface, { ChatInterfaceHandle } from "@/components/ChatInterface";
import CommandCenter from "@/components/CommandCenter";
import JarvisLoginScreen from "@/components/JarvisLoginScreen";
import { LLMProvider } from "@/lib/jarvisApi";
import { supabase } from "@/lib/supabase";
import { Cpu } from "lucide-react";

export default function ClientChatPage() {
  const [provider, setProvider] = useState<LLMProvider>("groq");
  const [apiKey, setApiKey] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [productionMode, setProductionMode] = useState(true);
  const chatRef = useRef<ChatInterfaceHandle>(null);

  // ── Guardia de autenticación: nadie sin sesión válida entra al chat ──────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return; // No cargar configuración sensible sin sesión activa

    supabase
      .from("cms_content")
      .select("content")
      .eq("id", "jarvis_config")
      .single()
      .then(({ data }) => {
        if (data?.content) {
          const c = data.content;
          if (c.activeProvider) {
            setProvider(c.activeProvider as LLMProvider);
          }
          if (c.groqKey && c.activeProvider === "groq") setApiKey(c.groqKey);
          if (c.openaiKey && c.activeProvider === "openai") setApiKey(c.openaiKey);
          if (c.geminiKey && c.activeProvider === "gemini") setApiKey(c.geminiKey);
        }
      });
  }, [session]);

  // ── Modo Producción: persistido en localStorage + Supabase (jarvis_runtime) ─
  useEffect(() => {
    const stored = localStorage.getItem("jarvis_production_mode");
    if (stored !== null) setProductionMode(stored === "true");

    supabase
      .from("cms_content")
      .select("content")
      .eq("id", "jarvis_runtime")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content?.productionMode !== undefined) {
          setProductionMode(!!data.content.productionMode);
        }
      });
  }, []);

  // ── Estado de carga inicial (evita parpadeo mostrando el chat sin sesión) ─
  if (!authChecked) {
    return (
      <div className="flex flex-col h-screen bg-[#050811] items-center justify-center gap-3">
        <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
        <span className="text-xs text-slate-500 font-mono">Verificando sesión...</span>
      </div>
    );
  }

  // ── Sin sesión válida: pantalla de login, el chat NUNCA se renderiza ─────
  if (!session) {
    return (
      <div className="flex flex-col h-screen bg-[#050811] overflow-hidden">
        <JarvisHeader />
        <JarvisLoginScreen />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#050811] overflow-hidden">
      {/* Header Superior Compacto: badges + selector de motor + Modo Producción */}
      <JarvisHeader
        provider={provider}
        onSelectProvider={(p, key) => {
          setProvider(p);
          if (key !== undefined) setApiKey(key);
        }}
        productionMode={productionMode}
        onProductionModeChange={setProductionMode}
        onOpenRag={() => chatRef.current?.openRag()}
        onOpenAgents={() => chatRef.current?.openAgents()}
        onOpenDevOps={() => chatRef.current?.openDevOps()}
        onExport={() => chatRef.current?.exportChat()}
      />

      {/* Split Workspace 65/35: Chat amplio a la izquierda, Centro de Comando compacto a la derecha */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 lg:w-[65%] flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-cyan-950/40">
          <ChatInterface ref={chatRef} currentProvider={provider} activeApiKey={apiKey} isOperatorView={false} />
        </div>
        <div className="lg:w-[35%] min-h-0 flex-1 lg:flex-none">
          <CommandCenter />
        </div>
      </main>
    </div>
  );
}
