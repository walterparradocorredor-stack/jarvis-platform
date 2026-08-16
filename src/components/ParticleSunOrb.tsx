"use client";

import React, { useEffect, useRef } from "react";

interface ParticleSunOrbProps {
  analyser: AnalyserNode | null;
  active: boolean;
  size?: number;
}

interface Particle {
  ringIndex: number;
  angle: number;
  speed: number;
  radiusJitter: number;
  size: number;
  hueShift: number;
}

const RINGS = [
  { radiusRatio: 0.62, tilt: 0.32, baseSpeed: 0.006, count: 34 },
  { radiusRatio: 0.82, tilt: 0.5, baseSpeed: -0.0042, count: 46 },
  { radiusRatio: 1.02, tilt: 0.22, baseSpeed: 0.0028, count: 58 },
];

/**
 * Núcleo de partículas doradas-naranjas con anillos orbitales, estilo
 * "Sci-Fi Core". Reacciona en vivo al AnalyserNode de la voz de JARVIS
 * (o queda en pulso idle suave si no hay audio sonando).
 */
export default function ParticleSunOrb({ analyser, active, size = 480 }: ParticleSunOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const levelRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (particlesRef.current.length) return;
    const particles: Particle[] = [];
    RINGS.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.count; i++) {
        particles.push({
          ringIndex,
          angle: (Math.PI * 2 * i) / ring.count,
          speed: ring.baseSpeed * (0.7 + Math.random() * 0.6),
          radiusJitter: 0.94 + Math.random() * 0.12,
          size: 1 + Math.random() * 1.8,
          hueShift: Math.random() * 18 - 9,
        });
      }
    });
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const freqBuffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const cx = size / 2;
    const cy = size / 2;
    const coreRadius = size * 0.16;

    function readLevel(): number {
      if (!analyser || !freqBuffer) return levelRef.current * 0.9; // decaimiento suave idle
      analyser.getByteFrequencyData(freqBuffer);
      let sum = 0;
      for (let i = 0; i < freqBuffer.length; i++) sum += freqBuffer[i];
      const avg = sum / freqBuffer.length / 255; // 0..1
      return avg;
    }

    function draw() {
      timeRef.current += 1;
      const t = timeRef.current;
      const targetLevel = readLevel();
      levelRef.current += (targetLevel - levelRef.current) * 0.18;
      const level = levelRef.current;

      ctx!.clearRect(0, 0, size, size);

      const idlePulse = 0.06 * Math.sin(t * 0.02);
      const pulse = 1 + idlePulse + level * 0.5;

      // Halo exterior
      const haloRadius = coreRadius * (2.2 + level * 1.4);
      const halo = ctx!.createRadialGradient(cx, cy, coreRadius * 0.4, cx, cy, haloRadius);
      halo.addColorStop(0, `rgba(255, 176, 59, ${0.28 + level * 0.35})`);
      halo.addColorStop(0.5, "rgba(255, 122, 26, 0.12)");
      halo.addColorStop(1, "rgba(255, 122, 26, 0)");
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx!.fill();

      // Núcleo pulsante
      const coreGrad = ctx!.createRadialGradient(
        cx - coreRadius * 0.25,
        cy - coreRadius * 0.25,
        coreRadius * 0.05,
        cx,
        cy,
        coreRadius * pulse
      );
      coreGrad.addColorStop(0, "#fff4d6");
      coreGrad.addColorStop(0.25, "#ffd166");
      coreGrad.addColorStop(0.6, "#ff9f1c");
      coreGrad.addColorStop(1, "#c9500a");
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * pulse, 0, Math.PI * 2);
      ctx!.fill();

      // Anillos orbitales de partículas (elipses = perspectiva 3D simulada)
      for (const p of particlesRef.current) {
        const ring = RINGS[p.ringIndex];
        p.angle += p.speed * (1 + level * 2.2);
        const ringRadius = coreRadius * ring.radiusRatio * pulse * p.radiusJitter;
        const x = cx + Math.cos(p.angle) * ringRadius;
        const y = cy + Math.sin(p.angle) * ringRadius * ring.tilt;
        const depth = (Math.sin(p.angle) + 1) / 2; // 0..1, simula profundidad
        const alpha = 0.25 + depth * 0.65 + level * 0.15;
        const r = p.size * (0.7 + depth * 0.6);

        ctx!.beginPath();
        ctx!.fillStyle = `hsla(${32 + p.hueShift}, 100%, ${60 + depth * 20}%, ${Math.min(alpha, 1)})`;
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Trazo sutil de los anillos
      for (const ring of RINGS) {
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, coreRadius * ring.radiusRatio * pulse, coreRadius * ring.radiusRatio * pulse * ring.tilt, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(255, 165, 60, ${0.08 + level * 0.1})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, active, size]);

  return <canvas ref={canvasRef} className="pointer-events-none select-none" />;
}
