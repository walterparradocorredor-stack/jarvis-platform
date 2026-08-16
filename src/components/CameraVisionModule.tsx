"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X, Aperture, Loader2 } from "lucide-react";

interface CameraVisionModuleProps {
  onCapture: (dataUrl: string) => void;
  onOpen?: () => void;
}

export default function CameraVisionModule({ onCapture, onOpen }: CameraVisionModuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    setIsOpen(true);
    onOpen?.(); // Cambiar a Gemini 2.5 Flash Vision apenas se abre la cámara, no solo al capturar.
    try {
      // Si el permiso ya fue concedido antes, el navegador lo recuerda para
      // este origen y activa la cámara sin volver a preguntar.
      // Se pide resolución HD real (no solo CSS) para que los documentos se
      // vean nítidos tanto en la previsualización como en la captura enviada.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 800 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Con autoPlay+muted en el <video> alcanza en la mayoría de navegadores
          // aunque este play() manual falle (ej. autoplay bloqueado momentáneamente).
        }
      }
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilítalo en la configuración del navegador."
          : `No se pudo activar la cámara: ${err.message}`
      );
    } finally {
      setIsStarting(false);
    }
  }, [onOpen]);

  const closeCamera = useCallback(() => {
    stopStream();
    setIsOpen(false);
    setError(null);
  }, [stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    onCapture(dataUrl);
    closeCamera();
  }, [onCapture, closeCamera]);

  useEffect(() => stopStream, [stopStream]);

  return (
    <>
      <button
        type="button"
        onClick={openCamera}
        className="p-2.5 rounded-xl border transition-all bg-slate-900 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300"
        title="Modo Visión: capturar y analizar con la cámara (Gemini 2.5 Flash Vision)"
      >
        <Camera className="w-4 h-4 text-cyan-400" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-4 sm:p-8">
          <div className="flex items-center justify-between w-full max-w-5xl">
            <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              👁️ JARVIS — Modo Visión
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/50">
                Gemini 2.5 Flash Vision
              </span>
            </span>
            <button
              onClick={closeCamera}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Visor panorámico HD: ancho amplio en PC (hasta 1280px), alto mínimo
              real de 480px para que documentos/imágenes se vean con claridad. */}
          <div className="relative w-full max-w-5xl min-h-[280px] sm:min-h-[420px] lg:min-h-[540px] aspect-video bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.2)]">
            {error ? (
              <div className="w-full h-full flex items-center justify-center text-center text-sm text-amber-300 p-6">
                {error}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />

                {/* Marco esquinero futurista */}
                <div className="pointer-events-none absolute inset-4 border border-cyan-400/20 rounded-xl">
                  <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                </div>

                {isStarting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-slate-300 text-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    Iniciando cámara HD...
                  </div>
                )}
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {!error && (
            <button
              type="button"
              onClick={capture}
              disabled={isStarting}
              className="px-6 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-40"
            >
              <Aperture className="w-5 h-5" />
              Capturar y Analizar
            </button>
          )}
        </div>
      )}
    </>
  );
}
