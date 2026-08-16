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
} from "lucide-react";
import AudioWaveform from "@/components/AudioWaveform";

interface VoiceModuleProps {
  onSpeechResult: (text: string) => void;
  onInterimResult?: (text: string) => void;
  lastJarvisMessage?: string;
  onStateChange?: (state: VoiceState) => void;
  onTtsAnalyser?: (analyser: AnalyserNode | null) => void;
  variant?: "compact" | "hero";
}

type VoiceState = "idle" | "listening" | "transcribing" | "speaking";

const BARGE_IN_THRESHOLD = 18; // RMS mínimo para considerar que Walter empezó a hablar
const BARGE_IN_SUSTAIN_MS = 180; // tiempo sostenido para evitar falsos positivos (ruido)

export default function VoiceModule({
  onSpeechResult,
  onInterimResult,
  lastJarvisMessage,
  onStateChange,
  onTtsAnalyser,
  variant = "compact",
}: VoiceModuleProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isConvoMode, setIsConvoMode] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const [ttsAnalyser, setTtsAnalyser] = useState<AnalyserNode | null>(null);
  const [ttsSimulated, setTtsSimulated] = useState(false);

  // Notifica al padre (ej. el orbe 3D del modo inmersivo) cada vez que cambia
  // el analyser de la voz de JARVIS — puramente aditivo, no toca el resto.
  useEffect(() => {
    onTtsAnalyser?.(ttsAnalyser);
  }, [ttsAnalyser, onTtsAnalyser]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceAnimRef = useRef<number | null>(null);
  const convoModeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");

  const ttsAudioElRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  // Los navegadores móviles solo permiten reproducir audio si el play() ocurre
  // dentro del mismo gesto de toque del usuario. La respuesta de JARVIS llega
  // después de un fetch (STT + LLM + TTS), ya fuera de ese gesto — sin esto,
  // el audio queda mudo en el celular aunque el código "funcione". Se llama
  // de forma SÍNCRONA, sin await antes, al inicio de cada botón de voz.
  const unlockAudioForMobile = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    try {
      const ctx = ttsAudioCtxRef.current || new AudioContext();
      ttsAudioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch {}
    try {
      const silent = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
      );
      silent.play().catch(() => {});
    } catch {}
  }, []);

  const bargeInStreamRef = useRef<MediaStream | null>(null);
  const bargeInRafRef = useRef<number | null>(null);
  const bargeInActiveRef = useRef(false);

  const browserVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Precargar voces del navegador: en Chrome getVoices() suele devolver []
  // en la primera llamada porque cargan async — sin esto, el fallback de
  // voz nativa podía quedar sin voz en español seleccionable la primera vez.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) browserVoicesRef.current = voices;
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    onStateChange?.(voiceState);
  }, [voiceState, onStateChange]);

  useEffect(() => {
    convoModeRef.current = isConvoMode;
  }, [isConvoMode]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // ─── BARGE-IN: mientras JARVIS habla, escuchar si Walter interrumpe ────────
  const stopBargeInMonitor = useCallback(() => {
    bargeInActiveRef.current = false;
    if (bargeInRafRef.current) cancelAnimationFrame(bargeInRafRef.current);
    bargeInStreamRef.current?.getTracks().forEach((t) => t.stop());
    bargeInStreamRef.current = null;
  }, []);

  const startBargeInMonitor = useCallback(
    async (onInterrupt: () => void) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        bargeInStreamRef.current = stream;
        bargeInActiveRef.current = true;

        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        let loudSince: number | null = null;

        const detect = () => {
          if (!bargeInActiveRef.current) {
            ctx.close().catch(() => {});
            return;
          }
          analyser.getByteFrequencyData(buffer);
          const rms = Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length);

          if (rms > BARGE_IN_THRESHOLD) {
            if (!loudSince) loudSince = Date.now();
            else if (Date.now() - loudSince > BARGE_IN_SUSTAIN_MS) {
              stopBargeInMonitor();
              ctx.close().catch(() => {});
              onInterrupt();
              return;
            }
          } else {
            loudSince = null;
          }
          bargeInRafRef.current = requestAnimationFrame(detect);
        };
        bargeInRafRef.current = requestAnimationFrame(detect);
      } catch {
        // Sin permiso de mic disponible para barge-in: JARVIS simplemente termina de hablar normal.
      }
    },
    [stopBargeInMonitor]
  );

  // ─── SILENCIO AUTOMÁTICO (VAD) para cortar la grabación ─────────────────────
  const startSilenceDetection = useCallback((stream: MediaStream, onSilence: () => void) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let silenceSince: number | null = null;
    const SILENCE_THRESHOLD = 10;
    const SILENCE_DURATION_MS = 1800;

    const detect = () => {
      analyser.getByteFrequencyData(buffer);
      const rms = Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length);

      if (rms < SILENCE_THRESHOLD) {
        if (!silenceSince) silenceSince = Date.now();
        else if (Date.now() - silenceSince > SILENCE_DURATION_MS) {
          onSilence();
          ctx.close().catch(() => {});
          return;
        }
      } else {
        silenceSince = null;
      }
      silenceAnimRef.current = requestAnimationFrame(detect);
    };
    silenceAnimRef.current = requestAnimationFrame(detect);
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
        if (silenceAnimRef.current) cancelAnimationFrame(silenceAnimRef.current);
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 500) {
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
              setVoiceState("speaking");
            } else {
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
    unlockAudioForMobile();
    if (isConvoMode) {
      setIsConvoMode(false);
      convoModeRef.current = false;
      if (silenceAnimRef.current) cancelAnimationFrame(silenceAnimRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      stopBargeInMonitor();
      ttsAudioElRef.current?.pause();
      window.speechSynthesis?.cancel();
      setVoiceState("idle");
      setIsMuted(false);
    } else {
      setIsConvoMode(true);
      convoModeRef.current = true;
      setIsMuted(false);
      await startRecording();
    }
  }, [isConvoMode, startRecording, stopBargeInMonitor, unlockAudioForMobile]);

  const toggleRecording = useCallback(async () => {
    unlockAudioForMobile();
    if (isConvoMode) return;
    if (voiceState === "listening") {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    } else if (voiceState === "idle") {
      await startRecording();
    }
  }, [voiceState, isConvoMode, startRecording, unlockAudioForMobile]);

  // ─── TTS FLUIDO: Google Cloud Neural2 con fallback a voz del navegador ──────
  const bestBrowserVoice = useCallback(() => {
    const voices = browserVoicesRef.current.length
      ? browserVoicesRef.current
      : window.speechSynthesis?.getVoices() || [];
    return (
      voices.find((v) => /es/.test(v.lang) && /Google|Natural|Neural/i.test(v.name)) ||
      voices.find((v) => v.lang === "es-US") ||
      voices.find((v) => /^es/.test(v.lang)) ||
      voices[0]
    );
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, onDone: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        // Navegador sin soporte de voz — no hay forma de hablar, pero JARVIS
        // igual debe seguir funcionando (texto ya está en el chat).
        onDone();
        return;
      }

      setTtsAnalyser(null);
      setTtsSimulated(true);
      const sentences = text
        .replace(/[*_#`~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0)
        .slice(0, 12);

      if (sentences.length === 0) {
        onDone();
        return;
      }

      const voice = bestBrowserVoice();
      let idx = 0;
      let doneCalled = false;
      const finish = () => {
        if (doneCalled) return;
        doneCalled = true;
        onDone();
      };

      const speakNext = () => {
        if (idx >= sentences.length) {
          finish();
          return;
        }
        const sentence = sentences[idx];
        const utter = new SpeechSynthesisUtterance(sentence);
        utter.lang = "es-US";
        if (voice) utter.voice = voice;
        utter.rate = 1.05;
        utter.pitch = 1;

        // Red de seguridad: Chrome tiene un bug conocido donde speak() puede
        // quedarse colgado sin disparar onend/onerror tras varios cancel().
        // Si no responde en un tiempo razonable, se avanza igual.
        const estimatedMs = Math.max(2500, sentence.length * 90);
        const safetyTimer = setTimeout(() => {
          idx += 1;
          speakNext();
        }, estimatedMs);

        utter.onend = () => {
          clearTimeout(safetyTimer);
          idx += 1;
          speakNext();
        };
        utter.onerror = () => {
          clearTimeout(safetyTimer);
          finish();
        };

        try {
          window.speechSynthesis.speak(utter);
        } catch {
          clearTimeout(safetyTimer);
          finish();
        }
      };
      speakNext();
    },
    [bestBrowserVoice]
  );

  const speak = useCallback(
    async (text: string) => {
      const cleanText = text.replace(/[*_#`~\[\]]/g, "").replace(/https?:\/\/\S+/g, "");
      let finished = false;

      const onDone = () => {
        if (finished) return;
        finished = true;
        stopBargeInMonitor();
        setTtsAnalyser(null);
        setTtsSimulated(false);
        if (convoModeRef.current) {
          setVoiceState("idle");
          setTimeout(() => startRecording(), 400);
        } else {
          setVoiceState("idle");
        }
      };

      const onBargeIn = () => {
        if (finished) return;
        finished = true;
        ttsAudioElRef.current?.pause();
        window.speechSynthesis?.cancel();
        setTtsAnalyser(null);
        setTtsSimulated(false);
        setVoiceState("idle");
        setTimeout(() => startRecording(), 150);
      };

      setVoiceState("speaking");
      if (convoModeRef.current) startBargeInMonitor(onBargeIn);

      // 1. Intentar voz Google Cloud Neural2 (fluida, natural). Si CUALQUIER
      // paso falla (fetch, 502, blob corrupto, autoplay bloqueado), cae al
      // fallback de voz nativa del navegador — JARVIS siempre debe hablar.
      let neural2Started = false;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText.slice(0, 4900) }),
        });

        if (!res.ok) {
          console.warn(`/api/tts respondió ${res.status}, usando voz del navegador como fallback.`);
        } else {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          ttsAudioElRef.current = audio;

          try {
            const ctx = ttsAudioCtxRef.current || new AudioContext();
            ttsAudioCtxRef.current = ctx;
            const source = ctx.createMediaElementSource(audio);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(ctx.destination);
            setTtsAnalyser(analyser);
          } catch {
            setTtsSimulated(true);
          }

          audio.onended = () => {
            URL.revokeObjectURL(url);
            onDone();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            onDone();
          };

          await audio.play();
          neural2Started = true;
        }
      } catch (err) {
        console.warn("Fallo obteniendo/reproduciendo TTS Neural2, usando voz del navegador:", err);
      }

      if (neural2Started) return;

      // 2. Fallback: voz del navegador (SpeechSynthesis) — SIEMPRE se ejecuta
      // si Neural2 no pudo hablar, sin importar la causa.
      speakWithBrowser(cleanText, onDone);
    },
    [startRecording, speakWithBrowser, startBargeInMonitor, stopBargeInMonitor]
  );

  useEffect(() => {
    if (!lastJarvisMessage) return;

    ttsAudioElRef.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();

    // JARVIS habla SIEMPRE que llega una respuesta nueva y no está silenciado,
    // esté o no activo el modo conversación continua (solo el reinicio
    // automático del micrófono al terminar depende de ese modo).
    if (isMuted) {
      if (convoModeRef.current) {
        setVoiceState("idle");
        setTimeout(() => startRecording(), 400);
      }
      return;
    }

    speak(lastJarvisMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJarvisMessage]);

  // ─── LIMPIEZA ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (silenceAnimRef.current) cancelAnimationFrame(silenceAnimRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      stopBargeInMonitor();
      ttsAudioElRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, [stopBargeInMonitor]);

  const toggleMute = () => {
    unlockAudioForMobile();
    if (!isMuted) {
      ttsAudioElRef.current?.pause();
      window.speechSynthesis?.cancel();
    }
    setIsMuted(!isMuted);
  };

  const stateLabel: Record<VoiceState, string> = {
    idle: "Escuchar",
    listening: "Grabando...",
    transcribing: "Whisper IA...",
    speaking: "JARVIS habla...",
  };

  if (variant === "hero") {
    const heroLabel = isConvoMode ? stateLabel[voiceState] : "Hablar con JARVIS";
    const heroColors: Record<VoiceState, string> = {
      idle: "from-emerald-500 to-cyan-600 shadow-emerald-500/30 border-emerald-400/60",
      listening: "from-red-500 to-rose-600 shadow-red-500/40 border-red-400/70 animate-pulse",
      transcribing: "from-cyan-500 to-blue-600 shadow-cyan-500/40 border-cyan-400/70 animate-pulse",
      speaking: "from-purple-500 to-fuchsia-600 shadow-purple-500/40 border-purple-400/70 animate-pulse",
    };

    return (
      <div className="flex flex-col items-center gap-2">
        {voiceState !== "idle" && (
          <AudioWaveform
            analyser={ttsAnalyser}
            simulated={voiceState === "speaking" && ttsSimulated}
            active={voiceState === "listening" || voiceState === "speaking"}
            color={voiceState === "speaking" ? "#c084fc" : "#22d3ee"}
          />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleConvoMode}
            className={`px-4 py-2 rounded-full bg-gradient-to-br border shadow-lg flex items-center gap-2 transition-all active:scale-95 ${heroColors[isConvoMode ? voiceState : "idle"]}`}
          >
            {isConvoMode && voiceState === "listening" && <Radio className="w-4 h-4 text-white animate-ping" />}
            {isConvoMode && voiceState === "transcribing" && <RefreshCw className="w-4 h-4 text-white animate-spin" />}
            {isConvoMode && voiceState === "speaking" && <Sparkles className="w-4 h-4 text-white animate-bounce" />}
            {(!isConvoMode || voiceState === "idle") && <PhoneCall className="w-4 h-4 text-white" />}
            <span className="text-xs font-bold text-white">{heroLabel}</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-full border transition-all ${
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

          {!isConvoMode && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={voiceState === "transcribing"}
              className={`p-2 rounded-full border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-lg ${
                voiceState === "transcribing"
                  ? "bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse"
                  : voiceState === "listening"
                  ? "bg-red-950 border-red-500 text-red-400 animate-pulse"
                  : micPermissionError
                  ? "bg-amber-950 border-amber-500 text-amber-300"
                  : "bg-slate-900 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300"
              }`}
              title="Grabar un solo mensaje de voz (sin conversación continua)"
            >
              <Mic className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>

        {micPermissionError && (
          <p className="text-xs text-amber-400 text-center max-w-xs">
            No se pudo acceder al micrófono. Revisa los permisos del navegador.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {voiceState !== "idle" && (
        <AudioWaveform
          analyser={ttsAnalyser}
          simulated={voiceState === "speaking" && ttsSimulated}
          active={voiceState === "listening" || voiceState === "speaking"}
          color={voiceState === "speaking" ? "#c084fc" : "#22d3ee"}
        />
      )}

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
