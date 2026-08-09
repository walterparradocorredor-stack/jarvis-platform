"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Radio, Sparkles } from "lucide-react";

interface VoiceModuleProps {
  onSpeechResult: (text: string) => void;
  lastJarvisMessage?: string;
  autoSpeak?: boolean;
}

export default function VoiceModule({
  onSpeechResult,
  lastJarvisMessage,
  autoSpeak = false,
}: VoiceModuleProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(!autoSpeak);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Inicializar Speech Recognition nativo
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "es-CO";

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");

          if (event.results[0].isFinal) {
            onSpeechResult(transcript);
            setIsListening(false);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Error en reconocimiento de voz:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, [onSpeechResult]);

  // Sintetizar voz cuando llega un mensaje de JARVIS
  useEffect(() => {
    if (lastJarvisMessage && !isMuted && typeof window !== "undefined" && window.speechSynthesis) {
      // Detener sintetizaciones previas
      window.speechSynthesis.cancel();

      // Limpiar markdown del mensaje para leer texto limpio
      const cleanText = lastJarvisMessage
        .replace(/[*_#`~]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "")
        .slice(0, 300); // Máximo 300 caracteres para respuesta hablada fluida

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "es-ES";
      utterance.rate = 1.05; // Velocidad ligeramente ágil
      utterance.pitch = 0.95; // Tono masculino sobrio

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [lastJarvisMessage, isMuted]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("No se pudo iniciar el dictado:", err);
      }
    }
  };

  const toggleMute = () => {
    if (isSpeaking && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Botón de Micrófono (Dictado por voz STT) */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={!speechSupported}
        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold shadow-lg ${
          isListening
            ? "bg-red-950/80 border-red-500 text-red-400 animate-pulse shadow-red-500/20"
            : "bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 shadow-slate-950/20"
        }`}
        title={isListening ? "Detener dictado de voz" : "Dictar mensaje por voz"}
      >
        {isListening ? (
          <>
            <Radio className="w-4 h-4 text-red-400 animate-ping" />
            <span className="hidden sm:inline text-red-300">Escuchando...</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Dictar</span>
          </>
        )}
      </button>

      {/* Botón de Respuesta Hablada (TTS Mute/Unmute) */}
      <button
        type="button"
        onClick={toggleMute}
        className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
          isSpeaking
            ? "bg-cyan-950/80 border-cyan-400 text-cyan-300 animate-pulse shadow-lg shadow-cyan-500/20"
            : isMuted
            ? "bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300"
            : "bg-slate-900/90 border-slate-800 text-cyan-400 hover:border-cyan-500/50"
        }`}
        title={isMuted ? "Activar respuestas habladas" : "Desactivar voz de JARVIS"}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className={`w-4 h-4 ${isSpeaking ? "text-cyan-400 animate-bounce" : ""}`} />
        )}
        {isSpeaking && <Sparkles className="w-3 h-3 text-cyan-300 hidden sm:inline animate-spin" />}
      </button>
    </div>
  );
}
