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
  const [micPermissionError, setMicPermissionError] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Inicializar Speech Recognition nativo con soporte mejorado
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
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript.trim()) {
            onSpeechResult(finalTranscript.trim());
            setIsListening(false);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Error en reconocimiento de voz:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setMicPermissionError(true);
          }
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
      window.speechSynthesis.cancel();

      const cleanText = lastJarvisMessage
        .replace(/[*_#`~]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "")
        .slice(0, 300);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "es-ES";
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [lastJarvisMessage, isMuted]);

  const toggleListening = async () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMicPermissionError(false);
      try {
        // Solicitar explícitamente el permiso del micrófono al navegador
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Permiso de micrófono denegado:", err);
        setMicPermissionError(true);
        setIsListening(false);
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
        id="jarvis-voice-btn"
        type="button"
        onClick={toggleListening}
        disabled={!speechSupported}
        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold shadow-lg ${
          isListening
            ? "bg-red-950/80 border-red-500 text-red-400 animate-pulse shadow-red-500/20"
            : micPermissionError
            ? "bg-amber-950/80 border-amber-500 text-amber-300"
            : "bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 shadow-slate-950/20"
        }`}
        title={
          micPermissionError
            ? "Permiso de micrófono denegado en el navegador"
            : isListening
            ? "Detener dictado de voz"
            : "Dictar mensaje por voz"
        }
      >
        {isListening ? (
          <>
            <Radio className="w-4 h-4 text-red-400 animate-ping" />
            <span className="hidden sm:inline text-red-300">Escuchando...</span>
          </>
        ) : micPermissionError ? (
          <>
            <MicOff className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline text-amber-300">Permiso Mic Requerido</span>
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
