"use client";

import React, { useEffect, useRef } from "react";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface JarvisOrbProps {
  state?: OrbState;
  size?: number;
  imageSrc?: string;
}

export default function JarvisOrb({ state = "idle", size = 40, imageSrc }: JarvisOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    // Colores por estado
    const stateColors: Record<OrbState, { core: string; ring: string; glow: string }> = {
      idle:      { core: "#0e7490", ring: "#06b6d4", glow: "rgba(6,182,212,0.25)" },
      listening: { core: "#991b1b", ring: "#ef4444", glow: "rgba(239,68,68,0.35)" },
      thinking:  { core: "#1d4ed8", ring: "#60a5fa", glow: "rgba(96,165,250,0.3)" },
      speaking:  { core: "#065f46", ring: "#10b981", glow: "rgba(16,185,129,0.35)" },
    };

    const render = () => {
      timeRef.current += 0.04;
      const t = timeRef.current;
      const colors = stateColors[state];

      ctx.clearRect(0, 0, size, size);

      // Outer Glow pulsante
      const pulseScale = state === "idle" ? 0.05 : state === "speaking" ? 0.18 : 0.12;
      const pulseR = r + Math.sin(t * (state === "listening" ? 4 : 2)) * pulseScale * r;

      const glowGrad = ctx.createRadialGradient(cx, cy, pulseR * 0.6, cx, cy, pulseR + 6);
      glowGrad.addColorStop(0, colors.glow);
      glowGrad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR + 6, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Anillo exterior rotatorio
      const ringCount = state === "speaking" ? 3 : 2;
      for (let i = 0; i < ringCount; i++) {
        const angle = t * (1.2 + i * 0.4) + (i * Math.PI * 2) / ringCount;
        const rx = cx + Math.cos(angle) * (pulseR - 1);
        const ry = cy + Math.sin(angle) * (pulseR - 1);

        ctx.beginPath();
        ctx.arc(cx, cy, pulseR - 0.5, angle - 0.4, angle + 0.4);
        ctx.strokeStyle = colors.ring;
        ctx.lineWidth = state === "speaking" ? 2.5 : 1.8;
        ctx.shadowColor = colors.ring;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Punto brillante en el arco
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = colors.ring;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Núcleo interior: clip circular con imagen o gradiente
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
      ctx.clip();

      if (imageSrc) {
        if (!imgRef.current) {
          const img = new Image();
          img.src = imageSrc;
          imgRef.current = img;
        }
        try {
          if (imgRef.current.complete) {
            ctx.drawImage(imgRef.current, cx - (r - 3), cy - (r - 3), (r - 3) * 2, (r - 3) * 2);
          }
        } catch (_) {}

        // Overlay de color semitransparente según estado
        const overlayGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r - 3);
        overlayGrad.addColorStop(0, "transparent");
        overlayGrad.addColorStop(1, colors.core + "99");
        ctx.fillStyle = overlayGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Gradiente puro sin imagen
        const coreGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r - 3);
        coreGrad.addColorStop(0, "#1e3a5f");
        coreGrad.addColorStop(0.5, colors.core);
        coreGrad.addColorStop(1, "#020617");
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ondas de audio si está hablando
      if (state === "speaking") {
        for (let w = 1; w <= 3; w++) {
          const waveR = (r - 3) * (0.3 + w * 0.2) + Math.sin(t * 5 + w) * 3;
          ctx.beginPath();
          ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(16,185,129,${0.5 - w * 0.12})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Parpadeante si está escuchando
      if (state === "listening") {
        const blinkAlpha = (Math.sin(t * 6) + 1) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${blinkAlpha * 0.25})`;
        ctx.fill();
      }

      ctx.restore();

      // Borde del núcleo
      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
      ctx.strokeStyle = colors.ring + "80";
      ctx.lineWidth = 1;
      ctx.stroke();

      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [state, size, imageSrc]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full shrink-0"
      style={{ imageRendering: "auto" }}
    />
  );
}
