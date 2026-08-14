"use client";

import React, { useEffect, useState } from "react";

interface Status {
  gmail: "ok" | "not_configured";
  calendar: "ok" | "not_configured";
  maps: "ok" | "pending";
  mapsError: string | null;
  whatsapp: "ok" | "not_configured";
  youtube: "ok" | "pending";
  youtubeError: string | null;
  rag: "ok" | "pending";
}

const POLL_MS = 60000;

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]"
      }`}
    />
  );
}

export default function IntegrationStatusBadges() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/tools/status");
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        /* mantener último estado conocido */
      }
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const gmailOk = status?.gmail === "ok" && status?.calendar === "ok";
  const mapsOk = status?.maps === "ok";
  const whatsappOk = status?.whatsapp === "ok";
  const youtubeOk = status?.youtube === "ok";
  const ragOk = status?.rag === "ok";

  const items = [
    {
      label: "Google Workspace MCP",
      ok: gmailOk,
      title: gmailOk ? "Conectado — Gmail y Calendar con datos reales" : "Pendiente autorización OAuth de Google",
    },
    {
      label: "Google Maps / GPS MCP",
      ok: mapsOk,
      title: mapsOk
        ? "Conectado — Directions, Places y Weather activas"
        : `Pendiente: ${status?.mapsError || "falta habilitar Directions API en Google Cloud Console"}`,
    },
    {
      label: "YouTube Data API",
      ok: youtubeOk,
      title: youtubeOk
        ? "Conectado"
        : `Pendiente: agregar YouTube Data API v3 a las restricciones de la API key (${status?.youtubeError || "bloqueada"})`,
    },
    {
      label: "Meta & WhatsApp MCP",
      ok: whatsappOk,
      title: whatsappOk
        ? "Conectado"
        : "Pendiente: falta crear la app en Meta for Developers y cargar credenciales",
    },
    {
      label: "Memoria RAG",
      ok: ragOk,
      title: ragOk ? "Conectado — Supabase pgvector accesible" : "Pendiente: Supabase no responde",
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((item) => (
        <div
          key={item.label}
          title={item.title}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold ${
            item.ok
              ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
              : "bg-amber-950/40 border-amber-800/50 text-amber-300"
          }`}
        >
          <Dot ok={item.ok} />
          <span className="hidden xl:inline">{item.label}</span>
          <span className="xl:hidden">{item.label.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}
