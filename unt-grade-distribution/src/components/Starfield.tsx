"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

export const STARFIELD_WIDTH = 1440;
export const STARFIELD_HEIGHT = 1000;
/** How many stars the home page shows; other pages show all of them. */
export const HOME_STAR_COUNT = 360;

// Fixed positions keep the sky stable across route changes and hydration.
export const stars = (() => {
  let seed = 8128;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  return Array.from({ length: 720 }, () => {
    const x = random() * 1440;
    const y = random() * 1000;
    const radius = [0.6, 0.8, 1, 0.7, 1.3, 0.8, 1.8][Math.floor(random() * 7)];
    const behindTitle = x > 300 && x < 1140 && y > 300 && y < 730;
    const opacity = Math.min(1, 1.5 * (0.5 + random() * 0.45) * (behindTitle ? 0.65 : 1));
    return { x, y, radius, opacity };
  });
})();

export default function Starfield() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const visibleStars = isHome ? stars.slice(0, HOME_STAR_COUNT) : stars;

  return (
    <div
      aria-hidden="true"
      className={`starfield-layer pointer-events-none fixed inset-0 z-[1] overflow-hidden ${isHome ? "" : "starfield-dim"}`}
    >
      <svg
        className="starfield h-full w-full"
        viewBox={`0 0 ${STARFIELD_WIDTH} ${STARFIELD_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {visibleStars.map((star, index) => (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="#fff"
            opacity={star.opacity}
            className="star"
            style={{
              animationDuration: `${3 + (index % 5) * 0.5}s`,
              animationDelay: `-${(index * 7.919) % (3 + (index % 5) * 0.5)}s`,
              "--star-opacity": star.opacity,
            } as CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}
