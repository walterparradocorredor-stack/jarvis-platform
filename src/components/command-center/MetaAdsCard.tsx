"use client";

import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MetaAdsSnapshot {
  spend: number;
  currency: string;
  clicks: number;
  impressions: number;
  account: string;
  updatedAt: string;
}

export default function MetaAdsCard() {
  const [snap, setSnap] = useState<MetaAdsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("cms_content")
      .select("content")
      .eq("id", "meta_ads_snapshot")
      .single()
      .then(({ data }) => {
        if (data?.content) setSnap(data.content as MetaAdsSnapshot);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-4 h-4 text-pink-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Meta Ads Consolidado</h3>
      </div>
      {loading ? (
        <div className="h-8 bg-slate-800/60 rounded animate-pulse" />
      ) : snap ? (
        <>
          <p className="text-xl font-extrabold text-white">
            ${snap.spend.toLocaleString("es-CO")} <span className="text-xs font-mono text-slate-500">{snap.currency}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {snap.clicks} clics · {snap.impressions.toLocaleString("es-CO")} impr. · {snap.account}
          </p>
        </>
      ) : (
        <p className="text-xs text-amber-300/80">Sin snapshot de Meta Ads disponible</p>
      )}
    </div>
  );
}
