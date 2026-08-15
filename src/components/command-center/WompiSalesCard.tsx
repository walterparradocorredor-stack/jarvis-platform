"use client";

import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function WompiSalesCard() {
  const [total, setTotal] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("purchases")
        .select("amount")
        .eq("status", "approved")
        .gte("created_at", startOfMonth.toISOString());

      if (!error && data) {
        setTotal(data.reduce((sum, row) => sum + Number(row.amount || 0), 0));
        setCount(data.length);
      }
      setLoading(false);
    };
    fetchSales();
    const interval = setInterval(fetchSales, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Ventas Wompi</h3>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-slate-800/60 rounded animate-pulse" />
      ) : (
        <>
          <p className="text-2xl font-extrabold text-white">
            ${(total ?? 0).toLocaleString("es-CO")} <span className="text-xs font-mono text-slate-500">COP</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {count} transacción{count === 1 ? "" : "es"} aprobada{count === 1 ? "" : "s"} este mes
          </p>
        </>
      )}
    </div>
  );
}
