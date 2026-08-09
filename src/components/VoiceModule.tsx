"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  RefreshCw,
  PhoneCall,
  PhoneOff,
} from "lucide-react";

interface VoiceModuleProps {
  onSpeechResult: (text: string) => void;
  onInterimResult?: (text: string) => void;
  lastJarvisMessage?: string;
  autoSpeak?: boolean;
}

type VoiceState = "idle" | "listening" | "transcribing" | "speaking";

export default function VoiceModule({
  onSpeechResult,
  onInterimResult,
  lastJarvisMessage,
  autoSpeak = false,
}: VoiceModuleProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isConvoMode, setIsConvoMode] = useState(false); // Modo conversación continua
  const [micPermissionError, setMicPermissionError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const convoModeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");

  // Sincronizar ref de modo conversación
  useEffect(() => {
    convoModeRef.current = isConvoMode;
  }, [isConvoMode]);

  // Sincronizar ref de voiceState
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // ─── SILENCIO AUTOMÁTICO: Audio Level Detection ─────────────────────────────
  const startSilenceDetection = useCallback((stream: MediaStream, onSilence: () => void) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let silenceSince: number | null = null;
    const SILENCE_THRESHOLD = 10; // RMS mínimo para considerar silencio
    const SILENCE_DURATION_MS = 1800; // 1.8 segundos de silencio → enviar

    const detect = () => {
      analyser.getByteFrequencyData(buffer);
      const rms = Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length);

      if (rms < SILENCE_THRESHOLD) {
        if (!silenceSince) silenceSince = Date.now();
        else if (Date.now() - silenceSince > SILENCE_DURATION_MS) {
          onSilence();
          return; // Parar loop
        }
      } else {
        silenceSince = null;
      }
      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  // ─── INICIAR GRABACIÓN ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (voiceStateRef.current !== "idle") return;
    setMicPermissionError(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Detener análisis
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 500) {
          // Demasiado corto, volver a escuchar
          if (convoModeRef.current) {
            setVoiceState("idle");
            setTimeout(() => startRecording(), 300);
          } else {
            setVoiceState("idle");
          }
          return;
        }

        setVoiceState("transcribing");

        try {
          const fd = new FormData();
          fd.append("file", blob, "dictation.webm");
          const res = await fetch("/api/whisper", { method: "POST", body: fd });

          if (res.ok) {
            const data = await res.json();
            const text = (data.text || "").trim();
            if (text) {
              if (onInterimResult) onInterimResult(text);
              onSpeechResult(text);
              // JARVIS va a responder → el TTS se encargará de reactivar el mic
              setVoiceState("speaking");
            } else {
              // Nada útil → volver a escuchar
              setVoiceState("idle");
              if (convoModeRef.current) setTimeout(() => startRecording(), 300);
            }
          } else {
            setVoiceState("idle");
            if (convoModeRef.current) setTimeout(() => startRecording(), 500);
          }
        } catch {
          setVoiceState("idle");
          if (convoModeRef.current) setTimeout(() => startRecording(), 500);
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setVoiceState("listening");

      // Silencio automático → detener grabación
      if (convoModeRef.current) {
        startSilenceDetection(stream, () => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        });
      }
    } catch {
      setMicPermissionError(true);
      setVoiceState("idle");
    }
  }, [onSpeechResult, onInterimResult, startSilenceDetection]);

  // ─── BOTÓN MODO CONVERSACIÓN CONTINUA ───────────────────────────────────────
  const toggleConvoMode = useCallback(async () => {
    if (isConvoMode) {
      // Desactivar
      setIsConvoMode(false);
      convoModeRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      window.speechSynthesis?.cancel();
      setVoiceState("idle");
      setIsMuted(false);
    } else {
      // Activar
      setIsConvoMode(true);
      convoModeRef.current = true;
      setIsMuted(false);
      await startRecording();
    }
  }, [isConvoMode, startRecording]);

  // ─── BOTÓN GRABACIÓN MANUAL (sin modo continuo) ──────────────────────────────
  const toggleRecording = useCallback(async () => {
    if (isConvoMode) return; // En modo convo, no usar el botón manual
    if (voiceState === "listening") {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } else if (voiceState === "idle") {
      await startRecording();
    }
  }, [voiceState, isConvoMode, startRecording]);

  // ─── TTS + REACTIVAR MIC AUTOMÁTICAMENTE ────────────────────────────────────
  useEffect(() => {
    if (!lastJarvisMessage) return;

    // Cancelar cualquier TTS activo
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();

    if (isMuted || !convoModeRef.current) {
      // Si está en modo convo pero muted, solo reactivar mic
      if (convoModeRef.current) {
        setVoiceState("idle");
        setTimeout(() => startRecording(), 400);
      }
      return;
    }

    const cleanText = lastJarvisMessage
      .replace(/[*_#`~\[\]]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .slice(0, 400);

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = "es-ES";
    utter.rate = 1.05;
    utter.pitch = 0.95;

    utter.onstart = () => setVoiceState("speaking");

    utter.onend = () => {
      // JARVIS terminó de hablar → reactivar micrófono automáticamente
      if (convoModeRef.current) {
        setVoiceState("idle");
        setTimeout(() => startRecording(), 500);
      } else {
        setVoiceState("idle");
      }
    };

    utter.onerror = () => {
      if (convoModeRef.current) {
        setVoiceState("idle");
        setTimeout(() => startRecording(), 500);
      } else {
        setVoiceState("idle");
      }
    };

    window.speechSynthesis?.speak(utter);
  }, [lastJarvisMessage, isMuted, startRecording]);

  // ─── LIMPIEZA ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleMute = () => {
    if (!isMuted) window.speechSynthesis?.cancel();
    setIsMuted(!isMuted);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  const stateLabel: Record<VoiceState, string> = {
    idle: "Escuchar",
    listening: "Grabando...",
    transcribing: "Whisper IA...",
    speaking: "JARVIS habla...",
  };

  return (
    <div className="flex items-center gap-2">
      {/* ── Botón Modo Conversación Continua ── */}
      <button
        type="button"
        onClick={toggleConvoMode}
        className={`px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold shadow-lg ${
          isConvoMode
            ? voiceState === "listening"
              ? "bg-red-950 border-red-500 text-red-300 animate-pulse shadow-red-500/20"
              : voiceState === "transcribing"
              ? "bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse shadow-cyan-500/20"
              : voiceState === "speaking"
              ? "bg-purple-950 border-purple-500 text-purple-300 animate-pulse shadow-purple-500/20"
              : "bg-emerald-950 border-emerald-500 text-emerald-300 shadow-emerald-500/20"
            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
        }`}
        title={isConvoMode ? "Desactivar conversación continua" : "Activar modo conversación continua con JARVIS"}
      >
        {isConvoMode ? (
          <>
            {voiceState === "listening" && <Radio className="w-4 h-4 animate-ping" />}
            {voiceState === "transcribing" && <RefreshCw className="w-4 h-4 animate-spin" />}
            {voiceState === "speaking" && <Sparkles className="w-4 h-4 animate-bounce" />}
            {voiceState === "idle" && <PhoneCall className="w-4 h-4" />}
            <span className="hidden sm:inline">{stateLabel[voiceState]}</span>
          </>
        ) : (
          <>
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Hablar con JARVIS</span>
          </>
        )}
      </button>

      {/* ── Botón Grabación Manual (solo cuando NO hay modo convo) ── */}
      {!isConvoMode && (
        <button
          id="jarvis-voice-btn"
          type="button"
          onClick={toggleRecording}
          disabled={voiceState === "transcribing"}
          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-lg ${
            voiceState === "transcribing"
              ? "bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse"
              : voiceState === "listening"
              ? "bg-red-950 border-red-500 text-red-400 animate-pulse"
              : micPermissionError
              ? "bg-amber-950 border-amber-500 text-amber-300"
              : "bg-slate-900 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300"
          }`}
          title={
            voiceState === "transcribing"
              ? "Transcribiendo..."
              : voiceState === "listening"
              ? "Detener grabación"
              : "Grabar mensaje de voz"
          }
        >
          {voiceState === "transcribing" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : voiceState === "listening" ? (
            <Radio className="w-4 h-4 animate-ping" />
          ) : micPermissionError ? (
            <MicOff className="w-4 h-4 text-amber-400" />
          ) : (
            <Mic className="w-4 h-4 text-cyan-400" />
          )}
        </button>
      )}

      {/* ── Mute/Unmute TTS ── */}
      <button
        type="button"
        onClick={toggleMute}
        className={`p-2.5 rounded-xl border transition-all ${
          voiceState === "speaking" && !isMuted
            ? "bg-purple-950 border-purple-500 text-purple-300 animate-pulse"
            : isMuted
            ? "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            : "bg-slate-900 border-slate-800 text-cyan-400 hover:border-cyan-500/40"
        }`}
        title={isMuted ? "Activar voz de JARVIS" : "Silenciar voz de JARVIS"}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
