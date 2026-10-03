"use client";
import { useState, useEffect } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { GRADE_COLORS, DARK_GRADE_COLORS } from "@/lib/grades";
import type { ChartDataPoint } from "@/lib/grades";
import { useTheme } from "@/hooks/useTheme";

interface GradeChartProps {
  data: ChartDataPoint[];
  mode?: "count" | "percentage";
  height?: number;
  controls?: boolean;
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
  controls = false,
}: GradeChartProps) {
  const { chartColors, isDark } = useTheme();
  const gradeColors = isDark ? DARK_GRADE_COLORS : GRADE_COLORS;
  const [displayMode, setDisplayMode] = useState(mode);
  const activeMode = controls ? displayMode : mode;
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const chartData = data.map(entry => ({ ...entry, value: activeMode === "count" ? entry.count : entry.percentage }));

  return (
    <div className="distribution-chart">
      {controls && <div className="chart-toolbar"><span>{activeMode === "count" ? "Number of students per grade" : "Share of enrollment per grade"}</span><div className="chart-switch" data-mode={displayMode} aria-label="Chart units"><button aria-pressed={displayMode === "count"} onClick={() => setDisplayMode("count")}>Count</button><button aria-pressed={displayMode === "percentage"} onClick={() => setDisplayMode("percentage")}>Percent</button></div></div>}
    <ResponsiveContainer width="100%" height={height}>
      <BarChart aria-label="Grade distribution" accessibilityLayer data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid vertical={false} stroke={chartColors.gridStroke} strokeDasharray="3 5" opacity={0.4} />
        <XAxis
          dataKey="grade"
          tick={{ fontSize: 12, fill: chartColors.axisStroke }}
          stroke={chartColors.axisStroke}
          axisLine={false}
          tickLine={false}
          tickMargin={12}
        />
        <YAxis
          tick={{ fontSize: 12, fill: chartColors.axisStroke }}
          stroke={chartColors.axisStroke}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(value) => activeMode === "percentage" ? `${value}%` : String(value)}
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
          isAnimationActive={controls && !reducedMotion}
          animationDuration={360}
          animationEasing="ease-out"
          dataKey="value"
          radius={[8, 8, 0, 0]}
          maxBarSize={64}
        >
          {data.map((entry) => (
            <Cell key={entry.grade} fill={gradeColors[entry.grade]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    {controls && <dl className="grade-breakdown" aria-label="Grade counts and percentages">{data.map(entry => <div key={entry.grade}><dt>{entry.grade}</dt><dd>{entry.count.toLocaleString()}</dd><p>{entry.percentage}%</p></div>)}</dl>}
    </div>
  );
}
