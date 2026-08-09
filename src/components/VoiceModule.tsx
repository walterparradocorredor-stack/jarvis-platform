"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Radio, Sparkles, RefreshCw } from "lucide-react";

interface VoiceModuleProps {
  onSpeechResult: (text: string) => void;
  onInterimResult?: (text: string) => void;
  lastJarvisMessage?: string;
  autoSpeak?: boolean;
}

export default function VoiceModule({
  onSpeechResult,
  onInterimResult,
  lastJarvisMessage,
  autoSpeak = false,
}: VoiceModuleProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(!autoSpeak);
  const [micPermissionError, setMicPermissionError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Iniciar / Detener Grabación de Audio para Whisper
  const toggleRecording = async () => {
    if (isRecording) {
      // Detener grabación y enviar a Whisper
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      setMicPermissionError(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Apagar pistas del micrófono
          stream.getTracks().forEach((track) => track.stop());

          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size < 1000) return; // Audio demasiado corto

          setIsTranscribing(true);
          try {
            const formData = new FormData();
            formData.append("file", audioBlob, "dictation.webm");

            const res = await fetch("/api/whisper", {
              method: "POST",
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text && data.text.trim()) {
                const cleanText = data.text.trim();
                if (onInterimResult) onInterimResult(cleanText);
                onSpeechResult(cleanText);
              }
            }
          } catch (err) {
            console.error("Error transcribiendo con Whisper:", err);
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start(200);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Permiso de micrófono denegado:", err);
        setMicPermissionError(true);
        setIsRecording(false);
      }
    }
  };

  // Sintetizar voz (TTS) cuando llega un mensaje de JARVIS
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

  const toggleMute = () => {
    if (isSpeaking && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Botón de Micrófono Whisper STT */}
      <button
        id="jarvis-voice-btn"
        type="button"
        onClick={toggleRecording}
        disabled={isTranscribing}
        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold shadow-lg ${
          isTranscribing
            ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 animate-pulse shadow-cyan-500/20"
            : isRecording
            ? "bg-red-950/80 border-red-500 text-red-400 animate-pulse shadow-red-500/20"
            : micPermissionError
            ? "bg-amber-950/80 border-amber-500 text-amber-300"
            : "bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 shadow-slate-950/20"
        }`}
        title={
          micPermissionError
            ? "Permiso de micrófono denegado en el navegador"
            : isTranscribing
            ? "Transcribiendo con Groq Whisper Large v3..."
            : isRecording
            ? "Haz clic para finalizar grabación Whisper"
            : "Dictar voz con Groq Whisper IA"
        }
      >
        {isTranscribing ? (
          <>
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="hidden sm:inline text-cyan-300 font-mono">Whisper IA...</span>
          </>
        ) : isRecording ? (
          <>
            <Radio className="w-4 h-4 text-red-400 animate-ping" />
            <span className="hidden sm:inline text-red-300">Grabando...</span>
          </>
        ) : micPermissionError ? (
          <>
            <MicOff className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Permiso Mic Requerido</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Dictar Whisper</span>
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
