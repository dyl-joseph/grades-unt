"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface Leaf {
  x: number;
  y: number;
  size: number;        // px
  rotation: number;    // radians
  rotSpeed: number;    // radians per frame
  rotAccel: number;    // slow rotation drift
  fallSpeed: number;   // base px per frame
  swayPhase: number;   // offset for horizontal sway
  swayAmp: number;     // how far it sways left/right
  swaySpeed: number;   // how fast it sways
  driftX: number;      // persistent horizontal wind drift
  alpha: number;       // opacity
  color: string;       // leaf fill color
  shape: number;       // 0 | 1 | 2  — different leaf silhouettes
}

const LEAF_COLORS = [
  "rgb(139, 90, 43)",    // warm brown
  "rgb(180, 130, 70)",   // golden brown
  "rgb(200, 80, 30)",    // burnt orange
  "rgb(190, 50, 20)",    // deep red
  "rgb(170, 55, 25)",    // rust
  "rgb(210, 150, 40)",   // amber-gold
  "rgb(165, 42, 42)",    // brick red
  "rgb(220, 120, 30)",   // tangerine
  "rgb(150, 100, 45)",   // olive brown
  "rgb(185, 85, 40)",    // copper
];

/**
 * Draws a simple leaf shape on the canvas at (0,0) facing right.
 * Three variations for visual variety.
 */
function drawLeafShape(ctx: CanvasRenderingContext2D, size: number, shape: number) {
  const s = size;
  ctx.beginPath();
  if (shape === 0) {
    // Oval leaf
    ctx.ellipse(0, 0, s * 0.55, s * 0.25, 0, 0, Math.PI * 2);
  } else if (shape === 1) {
    // Pointed leaf
    ctx.moveTo(-s * 0.5, 0);
    ctx.quadraticCurveTo(0, -s * 0.35, s * 0.5, 0);
    ctx.quadraticCurveTo(0, s * 0.35, -s * 0.5, 0);
  } else {
    // Rounded maple-ish
    ctx.moveTo(-s * 0.45, 0);
    ctx.bezierCurveTo(-s * 0.2, -s * 0.4, s * 0.2, -s * 0.3, s * 0.45, 0);
    ctx.bezierCurveTo(s * 0.2, s * 0.3, -s * 0.2, s * 0.4, -s * 0.45, 0);
  }
  ctx.closePath();
}

/**
 * Renders gently falling brown leaves on a <canvas>, visible only in light mode.
 */
export default function FallingLeaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let leaves: Leaf[] = [];
    let w = 0;
    let h = 0;

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
      generateLeaves();
    }

    function makeLeaf(startAtTop: boolean): Leaf {
      const sizeScale = isHome ? 1 : 0.82;
      const alphaScale = isHome ? 1 : 0.45;
      const size = (Math.random() * 8 + 6) * sizeScale; // 6–14 px
      const colorPool = isHome
        ? LEAF_COLORS
        : [
            "rgb(125, 96, 66)",
            "rgb(145, 112, 78)",
            "rgb(160, 98, 58)",
            "rgb(148, 84, 58)",
            "rgb(152, 118, 70)",
          ];
      return {
        x: Math.random() * w,
        y: startAtTop ? -size - Math.random() * h * 0.3 : Math.random() * h,
        size,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,  // slower base rotation
        rotAccel: (Math.random() - 0.5) * 0.0003, // gentle rotation drift
        fallSpeed: Math.random() * 0.3 + 0.15,    // slower drift down
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: Math.random() * 0.4 + 0.15,      // gentler sway
        swaySpeed: Math.random() * 0.005 + 0.002,  // slower sway cycle
        driftX: (Math.random() - 0.4) * 0.15,     // slight rightward wind bias
        alpha: (Math.random() * 0.25 + 0.15) * alphaScale, // 0.15–0.40
        color: colorPool[Math.floor(Math.random() * colorPool.length)],
        shape: Math.floor(Math.random() * 3),
      };
    }

    function generateLeaves() {
      const area = w * h;
      const density = isHome ? 35000 : 50000;
      const maxLeaves = isHome ? 75 : 25;
      const count = Math.min(Math.floor(area / density), maxLeaves);
      leaves = Array.from({ length: count }, () => makeLeaf(false));
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, w, h);

      for (let i = 0; i < leaves.length; i++) {
        const l = leaves[i];

        // movement — natural glide with varying speed
        const speedMod = 1 + 0.3 * Math.sin(time * 0.0007 + l.swayPhase); // subtle speed variation
        l.y += l.fallSpeed * speedMod;
        l.x += Math.sin(time * l.swaySpeed + l.swayPhase) * l.swayAmp + l.driftX;
        l.rotSpeed += l.rotAccel;
        l.rotSpeed = Math.max(-0.025, Math.min(0.025, l.rotSpeed)); // clamp
        l.rotation += l.rotSpeed;

        // recycle when off-screen
        if (l.y > h + l.size * 2) {
          leaves[i] = makeLeaf(true);
          leaves[i].y = -leaves[i].size;
          continue;
        }

        // draw
        ctx!.save();
        ctx!.translate(l.x, l.y);
        ctx!.rotate(l.rotation);
        ctx!.globalAlpha = l.alpha;

        // leaf body
        drawLeafShape(ctx!, l.size, l.shape);
        ctx!.fillStyle = l.color;
        ctx!.fill();

        // stem/vein line
        ctx!.beginPath();
        ctx!.moveTo(-l.size * 0.4, 0);
        ctx!.lineTo(l.size * 0.4, 0);
        ctx!.strokeStyle = l.color;
        ctx!.lineWidth = 0.7;
        ctx!.stroke();

        ctx!.restore();
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
  }, [isHome]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 z-[1] transition-opacity duration-700 dark:opacity-0 ${
        isHome ? "opacity-100" : "opacity-45"
      }`}
      aria-hidden="true"
    />
  );
}
