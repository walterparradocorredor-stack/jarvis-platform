"use client";

import React, { useEffect, useState } from "react";
import { Search, PlugZap } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SeoSnapshot {
  connected: boolean;
  clicks?: number;
  impressions?: number;
  position?: number;
  reason?: string;
}

export default function SearchConsoleCard() {
  const [seo, setSeo] = useState<SeoSnapshot | null>(null);

  useEffect(() => {
    supabase
      .from("cms_content")
      .select("content")
      .eq("id", "search_console_snapshot")
      .single()
      .then(({ data }) => {
        if (data?.content) setSeo(data.content as SeoSnapshot);
      });
  }, []);

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-4 h-4 text-orange-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">SEO Search Console</h3>
      </div>
      {seo?.connected ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-extrabold text-white">{seo.clicks}</p>
            <p className="text-[9px] text-slate-500 uppercase">Clics</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">{seo.impressions}</p>
            <p className="text-[9px] text-slate-500 uppercase">Impr.</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">{seo.position?.toFixed(1)}</p>
            <p className="text-[9px] text-slate-500 uppercase">Pos.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-1.5 text-amber-300/80">
          <PlugZap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug">
            {seo?.reason || "Search Console no conectado aún"}
          </p>
        </div>
      )}
    </div>
  );
}
