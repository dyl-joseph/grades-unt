"use client";

import { useEffect, useState, type ReactElement } from "react";

/* ── Original hand-drawn vine SVG groups ── */

/* Left-side vines (viewBox 0 0 160 1000) */
const leftVine1 = (
  <g key="l1">
    {/* Main thick vine */}
    <path d="M70 0 C45 100, 10 150, 35 250 C60 350, 15 400, 45 500 C75 600, 20 660, 50 760 C80 860, 30 920, 55 1000" fill="none" stroke="#558B2F" strokeWidth="4" opacity="0.7" />
    {/* Leaf branches */}
    <path d="M40 60 C25 72, 12 65, 4 78" fill="none" stroke="#388E3C" strokeWidth="2.5" />
    <ellipse cx="4" cy="78" rx="12" ry="7" fill="#388E3C" opacity="0.6" transform="rotate(-30 4 78)" />
    <path d="M55 200 C40 188, 22 194, 10 185" fill="none" stroke="#388E3C" strokeWidth="2.5" />
    <ellipse cx="10" cy="185" rx="14" ry="8" fill="#33691E" opacity="0.55" transform="rotate(-45 10 185)" />
    <path d="M30 360 C15 348, 5 354, 0 342" fill="none" stroke="#388E3C" strokeWidth="2" />
    <ellipse cx="0" cy="342" rx="11" ry="6" fill="#558B2F" opacity="0.6" transform="rotate(-20 0 342)" />
    <path d="M60 520 C42 508, 25 518, 12 506" fill="none" stroke="#388E3C" strokeWidth="2.5" />
    <ellipse cx="12" cy="506" rx="13" ry="7" fill="#388E3C" opacity="0.5" transform="rotate(-40 12 506)" />
    <path d="M35 680 C22 668, 8 674, 2 662" fill="none" stroke="#388E3C" strokeWidth="2" />
    <ellipse cx="2" cy="662" rx="10" ry="6" fill="#33691E" opacity="0.6" transform="rotate(-25 2 662)" />
    <path d="M58 840 C44 828, 26 834, 16 822" fill="none" stroke="#388E3C" strokeWidth="2.5" />
    <ellipse cx="16" cy="822" rx="12" ry="7" fill="#558B2F" opacity="0.5" transform="rotate(-35 16 822)" />
  </g>
);

const leftVine2 = (
  <g key="l2">
    {/* Medium secondary vine */}
    <path d="M100 0 C85 80, 60 130, 80 210 C100 290, 65 350, 85 430 C105 510, 70 570, 90 650 C110 730, 75 800, 95 880 C115 960, 80 980, 100 1000" fill="none" stroke="#33691E" strokeWidth="3" opacity="0.5" />
    <path d="M85 130 C70 122, 55 128, 45 118" fill="none" stroke="#558B2F" strokeWidth="2" />
    <ellipse cx="45" cy="118" rx="10" ry="6" fill="#558B2F" opacity="0.4" transform="rotate(-35 45 118)" />
    <path d="M90 450 C78 440, 62 446, 52 436" fill="none" stroke="#558B2F" strokeWidth="2" />
    <ellipse cx="52" cy="436" rx="11" ry="6" fill="#33691E" opacity="0.45" transform="rotate(-30 52 436)" />
  </g>
);

const leftVine3 = (
  <g key="l3">
    {/* Thin background vine */}
    <path d="M130 0 C125 50, 115 90, 125 140 C135 190, 120 240, 130 300 C140 360, 125 420, 135 480" fill="none" stroke="#388E3C" strokeWidth="2" opacity="0.3" />
  </g>
);

/* Right-side vines (viewBox 0 0 80 900) */
const rightVine1 = (
  <g key="r1">
    <path d="M40 0 C55 90, 75 140, 60 230 C45 320, 70 380, 55 470 C40 560, 68 620, 50 710 C35 800, 60 850, 45 900" fill="none" stroke="#558B2F" strokeWidth="3" opacity="0.7" />
    <path d="M58 70 C65 62, 72 66, 76 58" fill="none" stroke="#388E3C" strokeWidth="2" />
    <ellipse cx="76" cy="58" rx="7" ry="4" fill="#388E3C" opacity="0.6" transform="rotate(30 76 58)" />
    <path d="M48 240 C56 230, 66 234, 72 226" fill="none" stroke="#388E3C" strokeWidth="2" />
    <ellipse cx="72" cy="226" rx="8" ry="4" fill="#33691E" opacity="0.5" transform="rotate(40 72 226)" />
    <path d="M62 420 C68 412, 74 416, 78 408" fill="none" stroke="#388E3C" strokeWidth="1.5" />
    <ellipse cx="78" cy="408" rx="6" ry="4" fill="#558B2F" opacity="0.5" transform="rotate(25 78 408)" />
    <path d="M45 590 C54 580, 64 584, 70 576" fill="none" stroke="#388E3C" strokeWidth="2" />
    <ellipse cx="70" cy="576" rx="7" ry="4" fill="#388E3C" opacity="0.55" transform="rotate(35 70 576)" />
    <path d="M55 760 C62 752, 70 756, 75 748" fill="none" stroke="#388E3C" strokeWidth="1.5" />
    <ellipse cx="75" cy="748" rx="6" ry="4" fill="#33691E" opacity="0.5" transform="rotate(30 75 748)" />
  </g>
);

const rightVine2 = (
  <g key="r2">
    <path d="M15 0 C25 70, 5 130, 20 200 C35 270, 10 340, 25 410 C40 480, 15 550, 30 620 C45 690, 20 760, 35 830 C50 870, 25 890, 20 900" fill="none" stroke="#33691E" strokeWidth="2" opacity="0.45" />
    <path d="M22 160 C30 152, 40 156, 46 148" fill="none" stroke="#558B2F" strokeWidth="1.5" />
    <ellipse cx="46" cy="148" rx="6" ry="3.5" fill="#558B2F" opacity="0.45" transform="rotate(30 46 148)" />
    <path d="M28 500 C36 492, 44 496, 50 488" fill="none" stroke="#558B2F" strokeWidth="1.5" />
    <ellipse cx="50" cy="488" rx="7" ry="4" fill="#33691E" opacity="0.4" transform="rotate(35 50 488)" />
  </g>
);

const rightVine3 = (
  <g key="r3">
    <path d="M60 0 C65 40, 70 80, 65 130 C60 180, 68 220, 63 280 C58 340, 66 400, 60 460" fill="none" stroke="#388E3C" strokeWidth="1.5" opacity="0.25" />
  </g>
);

const ALL_LEFT: ReactElement[] = [leftVine1, leftVine2, leftVine3];
const ALL_RIGHT: ReactElement[] = [rightVine1, rightVine2, rightVine3];

/** Randomly pick 1–max items from an array (maintaining order). */
function pickRandom<T>(arr: T[], max: number): T[] {
  const count = 1 + Math.floor(Math.random() * max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function Vines() {
  const [left, setLeft] = useState<ReactElement[]>([]);
  const [right, setRight] = useState<ReactElement[]>([]);

  useEffect(() => {
    setLeft(pickRandom(ALL_LEFT, 3));
    setRight(pickRandom(ALL_RIGHT, 3));
  }, []);

  if (left.length === 0 && right.length === 0) return null;

  return (
    <>
      {/* Left vines */}
      <div className="pointer-events-none fixed left-0 top-0 bottom-0 z-10 w-40 opacity-75 brightness-75 saturate-150 dark:opacity-65 dark:brightness-180 dark:saturate-150">
        <svg
          className="h-full w-full"
          viewBox="0 0 160 1000"
          preserveAspectRatio="xMinYMin slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {left}
        </svg>
      </div>

      {/* Right vines */}
      <div className="pointer-events-none fixed right-0 top-0 bottom-0 z-10 w-20 opacity-65 brightness-75 saturate-150 dark:opacity-65 dark:brightness-180 dark:saturate-150">
        <svg
          className="h-full w-full"
          viewBox="0 0 80 900"
          preserveAspectRatio="xMaxYMin slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {right}
        </svg>
      </div>
    </>
  );
}
