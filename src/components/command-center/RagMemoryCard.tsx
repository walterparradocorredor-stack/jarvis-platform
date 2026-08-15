"use client";

import React, { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RagMemoryCard() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("jarvis_memory")
      .select("id", { count: "exact", head: true })
      .then(({ count: c }) => setCount(c ?? 0));
  }, []);

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Memoria RAG Vectorial</h3>
      </div>
      {count === null ? (
        <div className="h-8 bg-slate-800/60 rounded animate-pulse" />
      ) : (
        <>
          <p className="text-2xl font-extrabold text-white">{count}</p>
          <p className="text-[10px] text-slate-500 mt-1">vectores en pgvector (1536-d) · jarvis_memory</p>
        </>
      )}
    </div>
  );
}
