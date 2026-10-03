// Leaves hang off the vine path at these points: [x, y, rotation in degrees].
const LEAVES: Array<[number, number, number]> = [
  [34, 38, -35],
  [58, 92, 40],
  [20, 132, -50],
  [36, 186, 35],
  [52, 236, -40],
  [82, 288, 45],
  [74, 338, -35],
  [56, 388, 30],
];

function Vine({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 120 420"
      className={`vine-sway absolute top-0 hidden h-[26rem] w-36 text-jungle-moss/30 sm:block ${className}`}
      fill="none"
    >
      <path
        d="M20 0 C 60 80, -10 150, 40 230 S 90 340, 50 420"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {LEAVES.map(([x, y, rotation]) => (
        <ellipse
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          rx="17"
          ry="6.5"
          transform={`rotate(${rotation} ${x} ${y})`}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** Decorative foliage and sun dapples behind the hero. Light mode only; dark mode stays plain. */
export default function HeroAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden">
      <div>
        <div className="dapple absolute -left-16 top-8 h-72 w-72" />
        <div className="dapple absolute right-[8%] top-0 h-80 w-80" style={{ "--delay": "-5s" } as React.CSSProperties} />
        <div className="dapple absolute left-[38%] top-24 h-64 w-64" style={{ "--delay": "-9s" } as React.CSSProperties} />
      </div>
      <Vine className="left-0" />
      <Vine className="right-0 -scale-x-100" />
    </div>
  );
}
