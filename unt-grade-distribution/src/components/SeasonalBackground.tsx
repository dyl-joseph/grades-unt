"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function SeasonalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isHome = usePathname() === "/";
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let width = window.innerWidth, height = window.innerHeight;
    let seed = 8128;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const colors = ["#b16c36", "#bd8640", "#a95632", "#957446"];
    const particles = Array.from({ length: width < 640 ? 22 : 36 }, (_, index) => ({
      x: random() * width, y: random() * height, size: 10 + random() * 8,
      rotation: random() * Math.PI * 2, phase: index * 2.399, vx: 0, vy: 22,
      color: colors[Math.floor(random() * colors.length)],
    }));
    let target = document.documentElement.classList.contains("dark") ? 1 : 0;
    let blend = target;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Cache the glow once rather than repainting expensive shadows every frame.
    const glow = document.createElement("canvas"); glow.width = glow.height = 40;
    const glowContext = glow.getContext("2d")!;
    const gradient = glowContext.createRadialGradient(20,20,0,20,20,20);
    gradient.addColorStop(0,"#edf3af"); gradient.addColorStop(.12,"#e4ed91b0"); gradient.addColorStop(.4,"#cbd76030"); gradient.addColorStop(1,"#cbd76000");
    glowContext.fillStyle = gradient; glowContext.fillRect(0,0,40,40);
    const resize = () => {
      const nextWidth = window.innerWidth, nextHeight = window.innerHeight;
      particles.forEach(p => { p.x *= nextWidth / width; p.y *= nextHeight / height; });
      width = nextWidth; height = nextHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio,0,0,ratio,0,0);
    };
    resize();
    let frame = 0, last = 0, time = 0;
    const draw = (timestamp: number) => {
      if (document.hidden) return;
      frame = requestAnimationFrame(draw);
      if (last && timestamp - last < 32) return;
      const delta = last ? Math.min((timestamp - last) / 1000,.08) : 0;
      last = timestamp; time += delta;
      blend += Math.max(-delta / .7, Math.min(delta / .7,target - blend));
      ctx.clearRect(0,0,width,height);
      particles.forEach((p,index) => {
        if (!preference.matches) {
          const tx = (7 + Math.sin(time * .7 + p.phase) * 12) * (1-blend) + Math.sin(time * .45 + p.phase) * 17 * blend;
          const ty = (20 + index % 17) * (1-blend) + Math.cos(time * .36 + p.phase) * 13 * blend;
          const smooth = 1 - Math.exp(-delta * 2);
          p.vx += (tx-p.vx)*smooth; p.vy += (ty-p.vy)*smooth;
          p.x += p.vx*delta; p.y += p.vy*delta;
          if(p.y>height+24) p.y=-24; if(p.y < -25) p.y=height+24;
          if(p.x>width+24) p.x=-24; if(p.x < -25) p.x=width+24;
        }
        if(blend < .999) {
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation + Math.sin(time*.5+index)*.5);
          ctx.globalAlpha = .65*(1-blend); ctx.fillStyle=p.color;
          ctx.beginPath(); ctx.moveTo(-p.size*.45,0); ctx.quadraticCurveTo(0,-p.size*.45,p.size*.5,0); ctx.quadraticCurveTo(0,p.size*.45,-p.size*.45,0); ctx.fill();
          ctx.strokeStyle="#754c2c";ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-p.size*.45,0);ctx.lineTo(p.size*.4,0);ctx.stroke();ctx.restore();
        }
        if(blend > .001) { ctx.globalAlpha=blend*(.3+.7*(Math.sin(time*.8+p.phase)+1)/2);ctx.drawImage(glow,p.x-17,p.y-17,34,34); }
      });
      ctx.globalAlpha=1;
      if(preference.matches && Math.abs(target-blend)<.001) cancelAnimationFrame(frame);
    };
    const restart = () => { cancelAnimationFrame(frame); last=0; if(!document.hidden) frame=requestAnimationFrame(draw); };
    const observer = new MutationObserver(() => { target=document.documentElement.classList.contains("dark")?1:0;restart(); });
    observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("resize",resize);document.addEventListener("visibilitychange",restart);preference.addEventListener("change",restart);
    restart();
    return () => { cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("resize",resize);document.removeEventListener("visibilitychange",restart);preference.removeEventListener("change",restart); };
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none fixed inset-0 z-[1] h-full w-full ${isHome ? "opacity-65" : "opacity-48"}`} />;
}
