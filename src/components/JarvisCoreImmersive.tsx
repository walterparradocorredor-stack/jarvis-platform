"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ParticleSunOrb from "@/components/ParticleSunOrb";

interface JarvisCoreImmersiveProps {
  isOpen: boolean;
  onClose: () => void;
  analyser: AnalyserNode | null;
  responseText: string;
  orbState: "idle" | "listening" | "thinking" | "speaking";
}

const STATE_LABEL: Record<JarvisCoreImmersiveProps["orbState"], string> = {
  idle: "EN ESPERA",
  listening: "ESCUCHANDO",
  thinking: "PROCESANDO",
  speaking: "HABLANDO",
};

/**
 * Vista 3D inmersiva "JARVIS Core" — pantalla completa con el orbe de
 * partículas al centro. Mantener pulsado el núcleo o la barra espaciadora
 * dispara el mismo botón de voz real (#jarvis-voice-btn) que ya existe en
 * VoiceModule: no reimplementa la captura de audio, solo la controla a
 * distancia (mousedown = empieza a grabar, mouseup = envía).
 */
export default function JarvisCoreImmersive({
  isOpen,
  onClose,
  analyser,
  responseText,
  orbState,
}: JarvisCoreImmersiveProps) {
  const pressedRef = useRef(false);

  const pressVoiceButton = useCallback(() => {
    if (pressedRef.current) return;
    pressedRef.current = true;
    document.getElementById("jarvis-voice-btn")?.click();
  }, []);

  const releaseVoiceButton = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    document.getElementById("jarvis-voice-btn")?.click();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        pressVoiceButton();
      }
      if (e.code === "Escape") onClose();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        releaseVoiceButton();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isOpen, onClose, pressVoiceButton, releaseVoiceButton]);

  if (!isOpen) return null;

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
        onMouseDown={pressVoiceButton}
        onMouseUp={releaseVoiceButton}
        onMouseLeave={releaseVoiceButton}
        onTouchStart={(e) => {
          e.preventDefault();
          pressVoiceButton();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          releaseVoiceButton();
        }}
        className="relative cursor-pointer select-none touch-none w-full max-w-[440px] aspect-square flex items-center justify-center"
        title="Mantené pulsado para hablar"
      >
        <ParticleSunOrb analyser={analyser} active={isOpen} size={440} />
      </div>

      <div className="mt-2 text-xs font-mono tracking-[0.3em] text-orange-300/70 uppercase">
        {STATE_LABEL[orbState]}
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
