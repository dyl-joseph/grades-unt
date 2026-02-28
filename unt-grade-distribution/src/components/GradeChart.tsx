"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GRADE_COLORS } from "@/lib/grades";
import type { ChartDataPoint } from "@/lib/grades";
import { useTheme } from "@/hooks/useTheme";

interface GradeChartProps {
  data: ChartDataPoint[];
  mode?: "count" | "percentage";
  height?: number;
}

function CustomTooltip({
  active,
  payload,
  tooltipBg,
  tooltipBorder,
  tooltipText,
}: {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-lg"
      style={{
        backgroundColor: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        color: tooltipText,
      }}
    >
      <p className="font-semibold">{item.grade}</p>
      <p>Count: {item.count}</p>
      <p>Percentage: {item.percentage}%</p>
    </div>
  );
}

export default function GradeChart({
  data,
  mode = "count",
  height = 300,
}: GradeChartProps) {
  const { chartColors } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <XAxis
          dataKey="grade"
          tick={{ fontSize: 12, fill: chartColors.axisStroke }}
          stroke={chartColors.axisStroke}
        />
        <YAxis
          tick={{ fontSize: 12, fill: chartColors.axisStroke }}
          stroke={chartColors.axisStroke}
        />
        <Tooltip
          cursor={false}
          content={
            <CustomTooltip
              tooltipBg={chartColors.tooltipBg}
              tooltipBorder={chartColors.tooltipBorder}
              tooltipText={chartColors.tooltipText}
            />
          }
        />
        <Bar
          dataKey={mode === "count" ? "count" : "percentage"}
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry) => (
            <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
