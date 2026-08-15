"use client";

import React from "react";
import { ShieldCheck, FlaskConical } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProductionModeToggleProps {
  productionMode: boolean;
  onChange: (value: boolean) => void;
}

export default function ProductionModeToggle({ productionMode, onChange }: ProductionModeToggleProps) {
  const toggle = () => {
    const next = !productionMode;
    localStorage.setItem("jarvis_production_mode", String(next));
    onChange(next);
    supabase
      .from("cms_content")
      .upsert({ id: "jarvis_runtime", content: { productionMode: next } })
      .then();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={
        productionMode
          ? "Modo Producción activo: solo motores en la nube (Groq/OpenAI/Gemini)"
          : "Modo Desarrollo: permite el motor local Llama 3.1"
      }
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
        productionMode
          ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
          : "bg-amber-950/60 border-amber-600/40 text-amber-300"
      }`}
    >
      {productionMode ? <ShieldCheck className="w-3.5 h-3.5" /> : <FlaskConical className="w-3.5 h-3.5" />}
      <span className="hidden md:inline">{productionMode ? "Modo Producción" : "Modo Desarrollo"}</span>
    </button>
  );
}
