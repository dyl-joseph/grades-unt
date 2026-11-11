"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { HOME_STAR_COUNT, STARFIELD_HEIGHT, STARFIELD_WIDTH, stars } from "./Starfield";

/** A star grows into a leaf and starts to fall over this long. */
const STAR_TO_LEAF_MS = 1400;
/** A leaf slows to a stop and shrinks into a star over this long. */
const LEAF_TO_STAR_MS = 1400;
/** Settled leaf-stars then fade into the real starfield over this long. */
const STAR_FADE_MS = 1600;
/** Matches THEME_TRANSITION_MS: a star dot changes color as the page behind it does. */
const DOT_COLOR_MS = 500;

type Phase = "leaf" | "fromStar" | "toStar";

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
  phase: Phase;        // falling leaf, or morphing between star and leaf
  phaseStart: number;  // timestamp the current phase began
  starRadius: number;  // px, the dot this particle is as a star
  starAlpha: number;   // opacity as a star
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** White on the dark page, the leaf's own color on the light page, blended in between. */
function dotColor(leafColor: string, towardLeaf: number) {
  const [r, g, b] = (leafColor.match(/\d+/g) ?? ["255", "255", "255"]).map(Number);
  const mix = (channel: number) => Math.round(255 + (channel - 255) * towardLeaf);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
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
 * Renders gently falling brown leaves on a <canvas> in light mode. When the
 * theme switches, stars grow into leaves that start to fall, and leaves slow to
 * a stop and shrink into stars, so the two backgrounds hand over to each other.
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

    let animationId = 0;
    let leaves: Leaf[] = [];
    let w = 0;
    let h = 0;
    const root = document.documentElement;
    let dark = root.classList.contains("dark");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function resize() {
      const oldWidth = w;
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
      // Dark mode shows only the starfield; leaves are made from it on the next switch.
      if (dark) {
        leaves = leaves.filter((leaf) => leaf.phase === "toStar");
        return;
      }
      if (oldWidth === 0 || leaves.length === 0) {
        generateLeaves();
        return;
      }
      // Phones resize the viewport whenever the address bar slides in or out
      // while scrolling. Keep the leaves where they are instead of scattering
      // a new set; only follow a width change and top up or trim the count.
      if (w !== oldWidth) {
        for (const leaf of leaves) leaf.x *= w / oldWidth;
      }
      const target = leafCount();
      while (leaves.length > target) leaves.pop();
      while (leaves.length < target) leaves.push(makeLeaf(true));
    }

    function leafCount() {
      const area = w * h;
      const density = isHome ? 35000 : 50000;
      const maxLeaves = isHome ? 75 : 25;
      return Math.min(Math.floor(area / density), maxLeaves);
    }

    /** On-screen position and size of the starfield's stars (the SVG uses "slice" scaling). */
    function screenStars() {
      const scale = Math.max(w / STARFIELD_WIDTH, h / STARFIELD_HEIGHT);
      const offsetX = (w - STARFIELD_WIDTH * scale) / 2;
      const offsetY = (h - STARFIELD_HEIGHT * scale) / 2;
      const visible = isHome ? stars.slice(0, HOME_STAR_COUNT) : stars;
      return visible
        .map((star) => ({
          x: offsetX + star.x * scale,
          y: offsetY + star.y * scale,
          radius: Math.max(0.8, star.radius * scale),
          alpha: star.opacity,
        }))
        .filter((star) => star.x >= 0 && star.x <= w && star.y >= 0 && star.y <= h);
    }

    function starsToLeaves(now: number) {
      // Leaf-stars still settling from a quick double switch turn straight back.
      const settling = leaves.filter((leaf) => leaf.phase === "toStar");
      const pool = screenStars();
      const fresh: Leaf[] = [];
      for (let i = settling.length; i < leafCount() && pool.length > 0; i++) {
        const star = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const leaf = makeLeaf(false);
        leaf.x = star.x;
        leaf.y = star.y;
        leaf.starRadius = star.radius;
        leaf.starAlpha = star.alpha;
        fresh.push(leaf);
      }
      leaves = [...settling, ...fresh];
      for (const leaf of leaves) {
        leaf.phase = "fromStar";
        leaf.phaseStart = now;
      }
    }

    function leavesToStars(now: number) {
      for (const leaf of leaves) {
        leaf.phase = "toStar";
        leaf.phaseStart = now;
      }
    }

    /** 0 = fully a star, 1 = fully a leaf. Also how much of its fall speed the particle has. */
    function leafAmount(l: Leaf, now: number) {
      if (l.phase === "fromStar") return easeInOut(clamp01((now - l.phaseStart) / STAR_TO_LEAF_MS));
      if (l.phase === "toStar") return 1 - easeInOut(clamp01((now - l.phaseStart) / LEAF_TO_STAR_MS));
      return 1;
    }

    function start() {
      if (!animationId) animationId = requestAnimationFrame(draw);
    }

    function onThemeChange() {
      const nextDark = root.classList.contains("dark");
      if (nextDark === dark) return;
      dark = nextDark;
      if (reduceMotion.matches) {
        resize();
        return;
      }
      const now = performance.now();
      if (dark) leavesToStars(now);
      else starsToLeaves(now);
      start();
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
        phase: "leaf",
        phaseStart: 0,
        starRadius: 1,
        starAlpha: 0.8,
      };
    }

    function generateLeaves() {
      leaves = Array.from({ length: leafCount() }, () => makeLeaf(false));
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, w, h);

      for (let i = 0; i < leaves.length; i++) {
        const l = leaves[i];
        if (l.phase === "fromStar" && time - l.phaseStart >= STAR_TO_LEAF_MS) l.phase = "leaf";
        const amount = leafAmount(l, time);

        // Stars hold still; a leaf's fall, sway and spin ease in or out with the morph.
        const motion = amount * amount;
        const speedMod = 1 + 0.3 * Math.sin(time * 0.0007 + l.swayPhase); // subtle speed variation
        l.y += l.fallSpeed * speedMod * motion;
        l.x += (Math.sin(time * l.swaySpeed + l.swayPhase) * l.swayAmp + l.driftX) * motion;
        l.rotSpeed += l.rotAccel;
        l.rotSpeed = Math.max(-0.025, Math.min(0.025, l.rotSpeed)); // clamp
        l.rotation += l.rotSpeed * motion;

        // recycle when off-screen
        if (l.y > h + l.size * 2) {
          leaves[i] = makeLeaf(true);
          leaves[i].y = -leaves[i].size;
          continue;
        }

        // A settled leaf-star fades out as the real starfield fades in.
        let starAlpha = l.starAlpha;
        if (l.phase === "toStar") {
          const fade = clamp01((time - l.phaseStart - LEAF_TO_STAR_MS) / STAR_FADE_MS);
          starAlpha *= 1 - fade;
        }

        if (amount < 1 && starAlpha > 0) {
          const colorProgress = clamp01((time - l.phaseStart) / DOT_COLOR_MS);
          const lightPage = l.phase === "toStar" ? 1 - colorProgress : colorProgress;
          ctx!.globalAlpha = starAlpha * (1 - amount);
          ctx!.beginPath();
          ctx!.arc(l.x, l.y, l.starRadius, 0, Math.PI * 2);
          ctx!.fillStyle = dotColor(l.color, lightPage);
          ctx!.fill();
        }
        if (amount <= 0) continue;

        // draw
        ctx!.save();
        ctx!.translate(l.x, l.y);
        ctx!.rotate(l.rotation);
        ctx!.scale(amount, amount);
        ctx!.globalAlpha = l.alpha * amount;

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

      // In dark mode the canvas only runs until the leaf-stars have faded out.
      if (dark) {
        leaves = leaves.filter(
          (l) => l.phase === "toStar" && time - l.phaseStart < LEAF_TO_STAR_MS + STAR_FADE_MS,
        );
        if (leaves.length === 0) {
          ctx!.clearRect(0, 0, w, h);
          animationId = 0;
          return;
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    if (!dark) start();
    window.addEventListener("resize", resize);
    const observer = new MutationObserver(onThemeChange);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [isHome]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 z-[1] ${
        isHome ? "opacity-100" : "opacity-45"
      }`}
      aria-hidden="true"
    />
  );
}
