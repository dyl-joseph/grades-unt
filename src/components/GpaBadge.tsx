import { calculateGPA, gpaColor } from "@/lib/grades";
import type { GradeData } from "@/lib/grades";

interface GpaBadgeProps {
  gpa?: number | null;
  data?: GradeData;
}

export default function GpaBadge({ gpa, data }: GpaBadgeProps) {
  const value = gpa !== undefined ? gpa : data ? calculateGPA(data) : null;
  const colorClass = gpaColor(value);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {value !== null ? value.toFixed(2) : "N/A"}
    </span>
  );
}
