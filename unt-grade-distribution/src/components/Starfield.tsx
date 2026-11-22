"use client";

import { usePathname } from "next/navigation";

export const STARFIELD_WIDTH = 1440;
export const STARFIELD_HEIGHT = 1000;
/** How many animated stars the home page shows. */
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

/** How many phase offsets each twinkle speed is split into. */
const TWINKLE_PHASES = 8;
const TWINKLE_DURATIONS = [3, 3.5, 4, 4.5, 5];

/**
 * Stars that share a twinkle speed and (roughly) a phase share one animated
 * group, so about 40 groups animate instead of hundreds of circles. A group's
 * opacity multiplies each circle's own fixed opacity, which gives every star
 * the same 10%-to-full twinkle it would have on its own. Hundreds of separately
 * animated SVG circles made every theme switch restyle them all on one frame.
 */
function twinkleGroups(visible: typeof stars) {
  const groups = new Map<string, { duration: number; delay: number; members: typeof stars }>();
  visible.forEach((star, index) => {
    const speed = index % TWINKLE_DURATIONS.length;
    const duration = TWINKLE_DURATIONS[speed];
    const phase = Math.floor((((index * 7.919) % duration) / duration) * TWINKLE_PHASES);
    const key = `${speed}-${phase}`;
    let group = groups.get(key);
    if (!group) {
      group = { duration, delay: -((phase + 0.5) / TWINKLE_PHASES) * duration, members: [] };
      groups.set(key, group);
    }
    group.members.push(star);
  });
  return [...groups.values()];
}

export default function Starfield() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  const visibleStars = stars.slice(0, HOME_STAR_COUNT);

  return (
    <div
      aria-hidden="true"
      className="starfield-layer pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      <svg
        className="starfield h-full w-full"
        viewBox={`0 0 ${STARFIELD_WIDTH} ${STARFIELD_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {twinkleGroups(visibleStars).map((group, groupIndex) => (
          <g
            key={groupIndex}
            className="star-group"
            style={{ animationDuration: `${group.duration}s`, animationDelay: `${group.delay}s` }}
          >
            {group.members.map((star, index) => (
              <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="#fff" opacity={star.opacity} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
