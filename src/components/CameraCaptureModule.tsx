"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Camera, X, Aperture } from "lucide-react";

interface CameraCaptureModuleProps {
  onImageSelected: (base64Image: string | null) => void;
}

export default function CameraCaptureModule({ onImageSelected }: CameraCaptureModuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setError(null);
    setIsOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setError(
        err?.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilitalo en la configuración del navegador para este sitio."
          : `No se pudo acceder a la cámara: ${err?.message || err}`
      );
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopStream();
    setIsOpen(false);
    setError(null);
  }, [stopStream]);

  useEffect(() => stopStream, [stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    onImageSelected(base64);
    closeCamera();
  }, [onImageSelected, closeCamera]);

  return (
    <>
      <button
        type="button"
        onClick={openCamera}
        className="p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300"
        title="Tomar foto con la cámara para Visión Multimodal"
      >
        <Camera className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">Cámara</span>
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" /> Captura de Cámara — Visión JARVIS
                </span>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative bg-black aspect-video flex items-center justify-center">
                {error ? (
                  <p className="text-red-400 text-sm text-center px-6">{error}</p>
                ) : (
                  <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
                )}
              </div>

              <div className="p-4 flex justify-center">
                <button
                  type="button"
                  onClick={capture}
                  disabled={!!error}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold text-sm transition-all"
                >
                  <Aperture className="w-4 h-4" /> Capturar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
