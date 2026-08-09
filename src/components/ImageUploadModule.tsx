"use client";

import React, { useRef, useState, useEffect } from "react";
import { Image as ImageIcon, X, Eye, FileText, Sparkles } from "lucide-react";

interface ImageUploadModuleProps {
  onImageSelected: (base64Image: string | null) => void;
  selectedImage: string | null;
}

export default function ImageUploadModule({
  onImageSelected,
  selectedImage,
}: ImageUploadModuleProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  };

  // Escuchar pegado desde el portapapeles (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) processFile(blob);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* Botón para seleccionar o subir imagen */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
          selectedImage
            ? "bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20"
            : "bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300"
        }`}
        title="Adjuntar o pegar imagen (Ctrl+V) para análisis de Visión Multimodal"
      >
        <ImageIcon className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">Imagen</span>
        {selectedImage && <Sparkles className="w-3 h-3 text-cyan-300 animate-spin" />}
      </button>

      {/* Previsualización Flotante de Imagen Adjunta */}
      {selectedImage && (
        <div className="absolute bottom-12 left-0 z-30 p-2 bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-cyan-500/30 group">
            <img src={selectedImage} alt="Adjunto Visión" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <div className="text-left pr-2">
            <span className="text-[11px] font-bold text-slate-200 block flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" /> Visión Multimodal Cargada
            </span>
            <span className="text-[9px] font-mono text-cyan-400 block">
              Groq Llama 3.2 / GPT-4o Vision Ready
            </span>
          </div>
          <button
            type="button"
            onClick={() => onImageSelected(null)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
            title="Quitar imagen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
