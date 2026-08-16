"use client";

import React, { useEffect, useRef } from "react";

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  simulated?: boolean;
  active?: boolean;
  color?: string;
  barsCount?: number;
}

export default function AudioWaveform({
  analyser,
  simulated = false,
  active = true,
  color = "#22d3ee",
  barsCount = 24,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / barsCount;
    const bufferLength = analyser?.frequencyBinCount ?? barsCount;
    const dataArray = new Uint8Array(bufferLength);
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < barsCount; i++) {
        let value = 0.05;
        if (active && analyser) {
          analyser.getByteFrequencyData(dataArray);
          const idx = Math.floor((i / barsCount) * bufferLength);
          value = dataArray[idx] / 255;
        } else if (active && simulated) {
          value = 0.3 + 0.3 * Math.abs(Math.sin(phase + i * 0.5));
        }
        const barHeight = Math.max(3, value * height);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5 + value * 0.5;
        ctx.fillRect(i * barWidth + 1, (height - barHeight) / 2, barWidth - 2, barHeight);
      }
      phase += 0.25;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, simulated, active, color, barsCount]);

  return <canvas ref={canvasRef} width={120} height={28} className="rounded" />;
}
