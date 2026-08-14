"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";
import { LLMProvider } from "@/lib/jarvisApi";
import { supabase } from "@/lib/supabase";

export default function ClientChatPage() {
  const [provider, setProvider] = useState<LLMProvider>("groq");
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
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
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050811] overflow-hidden">
      {/* Navbar Superior con Selector de Perfil */}
      <Navbar />

      {/* Vista limpia inmersiva de Chat (Estilo ChatGPT) */}
      <main className="flex-1 flex flex-col h-[calc(100dvh-64px)] overflow-hidden">
        <ChatInterface currentProvider={provider} activeApiKey={apiKey} isOperatorView={false} />
      </main>
    </div>
  );
}
