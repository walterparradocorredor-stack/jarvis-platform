"use client";

import React, { useState } from "react";
import { Lock, Mail, KeyRound, ShieldCheck, AlertTriangle, Cpu } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function JarvisLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message
      );
    }
    // Al iniciar sesión con éxito, el listener de onAuthStateChange en la
    // página de chat detecta la sesión y renderiza la interfaz automáticamente.
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none" />

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-[#0b1021]/90 backdrop-blur-2xl border border-cyan-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center space-y-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
          <Cpu className="w-7 h-7 text-white" />
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-white tracking-wide">
            Acceso Privado — JARVIS AI
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            Inicia sesión con tu cuenta autorizada para acceder al chat privado del
            Ecosistema Digital.
          </p>
        </div>

        <div className="space-y-3 text-left">
          <div>
            <label className="text-[10px] text-cyan-400 font-semibold uppercase block mb-1">
              Correo electrónico
            </label>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-cyan-500 transition-colors">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-cyan-400 font-semibold uppercase block mb-1">
              Contraseña
            </label>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-cyan-500 transition-colors">
              <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !email || !password}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          <Lock className="w-4 h-4" />
          {isSubmitting ? "Verificando..." : "Iniciar sesión"}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autenticación Supabase — sesión cifrada de extremo a extremo</span>
        </div>
      </form>
    </div>
  );
}
