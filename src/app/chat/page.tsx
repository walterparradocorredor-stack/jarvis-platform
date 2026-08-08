"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";
import { LLMProvider } from "@/lib/jarvisApi";

export default function ClientChatPage() {
  const [provider] = useState<LLMProvider>("groq");

  return (
    <div className="flex flex-col h-screen bg-[#050811] overflow-hidden">
      {/* Navbar Superior con Selector de Perfil */}
      <Navbar />

      {/* Vista limpia inmersiva de Chat (Estilo ChatGPT) */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <ChatInterface currentProvider={provider} isOperatorView={false} />
      </main>
    </div>
  );
}
