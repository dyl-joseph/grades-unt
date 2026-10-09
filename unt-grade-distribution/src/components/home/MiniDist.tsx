import { GRADE_COLORS } from "@/lib/grades";

const GRADES = ["A", "B", "C", "D", "F", "W"] as const;

/** Thin stacked bar of the A, B, C, D, F, W share, in the same colors as the grade charts. */
export default function MiniDist({ dist, className = "" }: { dist: number[]; className?: string }) {
  const label = GRADES.map((grade, index) => `${grade} ${Math.round(dist[index])}%`).join(", ");

  return (
    <div
      role="img"
      aria-label={`Grade mix: ${label}`}
      title={label}
      className={`flex h-1.5 overflow-hidden rounded-full bg-jungle-tan-dark/25 dark:bg-ui-raised ${className}`}
    >
      {GRADES.map((grade, index) => (
        <span key={grade} className="h-full" style={{ width: `${dist[index]}%`, background: GRADE_COLORS[grade] }} />
      ))}
    </div>
  );
}
