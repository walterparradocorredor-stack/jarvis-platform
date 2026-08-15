"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AppointmentSnapshot {
  title: string;
  location: string;
  start: string;
  end?: string;
  updatedAt: string;
}

export default function NextAppointmentCard() {
  const [appt, setAppt] = useState<AppointmentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("cms_content")
      .select("content")
      .eq("id", "next_appointment")
      .single()
      .then(({ data }) => {
        if (data?.content) setAppt(data.content as AppointmentSnapshot);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-900/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Próxima Cita</h3>
      </div>
      {loading ? (
        <div className="h-10 bg-slate-800/60 rounded animate-pulse" />
      ) : appt ? (
        <>
          <p className="text-sm font-bold text-white leading-snug break-words">{appt.title}</p>
          {appt.location && (
            <p className="text-[10px] text-slate-400 mt-1 flex items-start gap-1">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="break-words">{appt.location}</span>
            </p>
          )}
          <p className="text-[10px] text-slate-500 font-mono mt-1.5">
            {appt.start}
            {appt.end ? ` → ${appt.end}` : ""}
          </p>
        </>
      ) : (
        <p className="text-xs text-amber-300/80">Sin citas próximas registradas</p>
      )}
    </div>
  );
}
