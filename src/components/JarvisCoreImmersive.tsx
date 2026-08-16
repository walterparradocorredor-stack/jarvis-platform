"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ParticleSunOrb from "@/components/ParticleSunOrb";

interface JarvisCoreImmersiveProps {
  isOpen: boolean;
  onClose: () => void;
  analyser: AnalyserNode | null;
  responseText: string;
  orbState: "idle" | "listening" | "thinking" | "speaking";
  onStartVoice: () => void;
  onStopVoice: () => void;
}

const STATE_LABEL: Record<JarvisCoreImmersiveProps["orbState"], string> = {
  idle: "EN ESPERA",
  listening: "ESCUCHANDO...",
  thinking: "PROCESANDO",
  speaking: "HABLANDO",
};

/**
 * Vista 3D inmersiva "JARVIS Core" — pantalla completa con el orbe de
 * partículas al centro. Mantener pulsado el núcleo o la barra espaciadora
 * llama directo a onStartVoice/onStopVoice (funciones reales expuestas por
 * VoiceModule vía ref) — no simula clicks en el DOM, porque el botón real
 * de voz no siempre está montado (ej. en modo conversación continua).
 */
export default function JarvisCoreImmersive({
  isOpen,
  onClose,
  analyser,
  responseText,
  orbState,
  onStartVoice,
  onStopVoice,
}: JarvisCoreImmersiveProps) {
  const pressedRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);

  const press = () => {
    if (pressedRef.current) return;
    pressedRef.current = true;
    setIsPressed(true);
    onStartVoice();
  };

  const release = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    setIsPressed(false);
    onStopVoice();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        press();
      }
      if (e.code === "Escape") onClose();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        release();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const listening = isPressed || orbState === "listening";
  const label = listening ? "ESCUCHANDO..." : STATE_LABEL[orbState];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#03050c] flex flex-col items-center justify-center overflow-hidden">
      {/* Fondo radial sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,140,40,0.08),rgba(3,5,12,0)_60%)] pointer-events-none" />

      <button
        type="button"
        onClick={onClose}
        title="Cerrar (Esc)"
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500/40 transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute top-5 left-5 text-[11px] font-mono tracking-[0.2em] text-orange-300/80 uppercase z-10">
        JARVIS Core 3D
      </div>

      <div
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          press();
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          release();
        }}
        onPointerCancel={release}
        className="relative cursor-pointer select-none touch-none w-full max-w-[440px] aspect-square flex items-center justify-center"
        title="Mantené pulsado para hablar"
      >
        <ParticleSunOrb analyser={analyser} active={isOpen} size={440} />
      </div>

      <div
        className={`mt-2 text-xs font-mono tracking-[0.3em] uppercase transition-all ${
          listening ? "text-amber-300 animate-pulse font-bold text-sm" : "text-orange-300/70"
        }`}
      >
        {label}
      </div>

      {responseText && (
        <div className="mt-6 max-w-2xl px-6 text-center">
          <p className="text-lg sm:text-xl leading-relaxed text-slate-100 font-light">{responseText}</p>
        </div>
      )}

      <div className="absolute bottom-8 left-0 right-0 text-center px-4">
        <p className="text-[11px] sm:text-xs font-mono tracking-[0.15em] text-slate-500 uppercase">
          HABLANDO — MANTÉN PULSADO EL NÚCLEO O LA BARRA ESPACIADORA
        </p>
      </div>
    </div>,
    document.body
  );
}
