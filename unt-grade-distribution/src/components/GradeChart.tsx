"use client";

import { useState } from "react";
import { GRADE_COLORS } from "@/lib/grades";
import type { ChartDataPoint } from "@/lib/grades";

interface GradeChartProps {
  data: ChartDataPoint[];
  mode?: "count" | "percentage";
  height?: number;
}

export default function GradeChart({
  data,
  mode = "count",
  height = 300,
}: GradeChartProps) {
  const [tooltip, setTooltip] = useState<{
    item: ChartDataPoint;
    x: number;
    y: number;
  } | null>(null);

  const maxValue = Math.max(
    ...data.map((d) => (mode === "count" ? d.count : d.percentage)),
    1
  );

  return (
    <div className="relative" style={{ height }} data-chart>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
          style={{
            left: Math.min(tooltip.x, 200),
            top: Math.max(tooltip.y - 70, 0),
          }}
        >
          <p className="font-semibold">{tooltip.item.grade}</p>
          <p>Count: {tooltip.item.count}</p>
          <p>Percentage: {tooltip.item.percentage}%</p>
        </div>
      )}

      {/* Bar chart */}
      <div className="flex h-full items-end gap-0.75 sm:gap-1">
        {data.map((entry) => {
          const value = mode === "count" ? entry.count : entry.percentage;
          const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div
              key={entry.grade}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              style={{ height: "100%" }}
            >
              {/* Bar container */}
              <div className="relative flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full rounded-t transition-all duration-200 hover:brightness-110"
                  style={{
                    height: `${Math.max(pct, 1)}%`,
                    backgroundColor: GRADE_COLORS[entry.grade],
                    minHeight: value > 0 ? 4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parent =
                      e.currentTarget
                        .closest("[data-chart]")
                        ?.getBoundingClientRect();
                    if (parent) {
                      setTooltip({
                        item: entry,
                        x: rect.left - parent.left,
                        y: rect.top - parent.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              </div>
              {/* Label */}
              <span className="text-[10px] font-medium text-gray-500 sm:text-xs dark:text-gray-400">
                {entry.grade}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
