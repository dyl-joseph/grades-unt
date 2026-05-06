import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GRADE_COLORS } from "../../lib/grades";
import type { ChartDataPoint } from "../../lib/grades";

interface GradeChartProps {
  data: ChartDataPoint[];
  height?: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 600, margin: 0 }}>{item.grade}</p>
      <p style={{ margin: "2px 0 0" }}>Count: {item.count}</p>
      <p style={{ margin: "2px 0 0" }}>Percentage: {item.percentage}%</p>
    </div>
  );
}

export default function GradeChart({ data, height = 200 }: GradeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#666" }} stroke="#ccc" />
        <YAxis tick={{ fontSize: 11, fill: "#666" }} stroke="#ccc" />
        <Tooltip cursor={false} content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
