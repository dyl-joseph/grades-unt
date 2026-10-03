"use client";

import { usePathname } from "next/navigation";

// Fixed positions keep the sky stable across route changes and hydration.
const stars = (() => {
  let seed = 8128;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  return Array.from({ length: 120 }, () => {
    const x = random() * 1440;
    const y = random() * 1000;
    const radius = [0.6, 0.8, 1, 0.7, 1.3, 0.8, 1.8][Math.floor(random() * 7)];
    const behindTitle = x > 300 && x < 1140 && y > 300 && y < 730;
    const opacity = (0.35 + random() * 0.55) * (behindTitle ? 0.45 : 1);
    return { x, y, radius, opacity };
  });
})();

export default function Starfield() {
  const isHome = usePathname() === "/";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[1] hidden overflow-hidden dark:block ${isHome ? "opacity-80" : "opacity-30"}`}
    >
      <svg
        className="starfield h-full w-full"
        viewBox="0 0 1440 1000"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {stars.map((star, index) => (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="#fff"
            opacity={star.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
