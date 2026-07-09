import { calculateGPA, gpaColor } from "@/lib/grades";
import type { GradeData } from "@/lib/grades";

interface GpaBadgeProps {
  gpa?: number | null;
  data?: GradeData;
  label?: string;
}

export default function GpaBadge({ gpa, data, label = "Average GPA" }: GpaBadgeProps) {
  const value = gpa !== undefined ? gpa : data ? calculateGPA(data) : null;
  const colorClass = gpaColor(value);
  const displayValue = value !== null ? value.toFixed(2) : "N/A";

  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={`${label}: ${displayValue}`}>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
        {displayValue}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-950 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block group-focus:block dark:bg-green-100 dark:text-green-950"
      >
        {label}
      </span>
    </span>
  );
}
