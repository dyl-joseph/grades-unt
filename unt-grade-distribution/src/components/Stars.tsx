"use client";

import { useEffect, useRef } from "react";

interface Firefly {
  x: number;
  y: number;
  r: number;           // core radius
  phase: number;       // twinkle phase offset
  glowSpeed: number;   // how fast it pulses
  baseAlpha: number;   // peak brightness
  // drift
  vx: number;
  vy: number;
  // wandering – smooth random turns
  angle: number;
  turnRate: number;
  speed: number;
}

/**
 * Renders drifting, glowing fireflies on a <canvas>, visible only in dark mode.
 */
export default function Stars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let flies: Firefly[] = [];
    let w = 0;
    let h = 0;

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
      generateFlies();
    }

    function generateFlies() {
      const area = w * h;
      // ~1 firefly per 12 000 px² — sparser than stars, but glow makes them pop
      const count = Math.min(Math.floor(area / 12000), 200);
      flies = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.25 + 0.25; // px per frame
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.8,            // core 0.8–2.2 px
          phase: Math.random() * Math.PI * 2,
          glowSpeed: Math.random() * 0.4 + 0.15,
          baseAlpha: Math.random() * 0.45 + 0.2,    // 0.2–0.65
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          angle,
          turnRate: (Math.random() - 0.5) * 0.02,   // gentle turns
          speed,
        };
      });
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, w, h);

      for (const f of flies) {
        /* --- movement --- */
        // slowly change direction (wander)
        f.turnRate += (Math.random() - 0.5) * 0.005;
        f.turnRate = Math.max(-0.03, Math.min(0.03, f.turnRate));
        f.angle += f.turnRate;
        f.vx = Math.cos(f.angle) * f.speed;
        f.vy = Math.sin(f.angle) * f.speed;
        f.x += f.vx;
        f.y += f.vy;

        // wrap around edges with a soft margin so glow isn't clipped
        const margin = 30;
        if (f.x < -margin) f.x = w + margin;
        if (f.x > w + margin) f.x = -margin;
        if (f.y < -margin) f.y = h + margin;
        if (f.y > h + margin) f.y = -margin;

        /* --- glow pulse --- */
        const pulse = (Math.sin(time * 0.001 * f.glowSpeed + f.phase) + 1) / 2; // 0‑1
        const alpha = f.baseAlpha * (0.3 + 0.7 * pulse);

        /* --- draw: soft radial glow + bright core --- */
        // outer glow
        const glowR = f.r * 8;
        const grad = ctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
        grad.addColorStop(0, `rgba(180, 220, 80, ${alpha * 0.7})`);
        grad.addColorStop(0.3, `rgba(140, 200, 60, ${alpha * 0.3})`);
        grad.addColorStop(1, `rgba(100, 180, 40, 0)`);
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, glowR, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();

        // bright core
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(220, 255, 140, ${Math.min(1, alpha * 1.5)})`;
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    animationId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] opacity-0 transition-opacity duration-700 dark:opacity-100"
      aria-hidden="true"
    />
  );
}
