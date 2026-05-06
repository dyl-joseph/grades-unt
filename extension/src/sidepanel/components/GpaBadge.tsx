import { gpaColorHex } from "../../lib/grades";

interface GpaBadgeProps {
  gpa: number | null;
}

export default function GpaBadge({ gpa }: GpaBadgeProps) {
  const { bg, color } = gpaColorHex(gpa);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 9999,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {gpa !== null ? gpa.toFixed(2) : "N/A"}
    </span>
  );
}
