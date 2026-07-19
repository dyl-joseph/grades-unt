"use client";

import { lazy, Suspense, useRef, useState, useEffect } from "react";
import type { ChartDataPoint } from "@/lib/grades";

const GradeChart = lazy(() => import("./GradeChart"));

interface LazyChartProps {
  data: ChartDataPoint[];
  height?: number;
  mode?: "count" | "percentage";
  showDataFallback?: boolean;
}

function ChartFallback({
  data,
  height,
  showData,
}: {
  data: ChartDataPoint[];
  height: number;
  showData: boolean;
}) {
  if (!showData) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-jungle-tan-dark/10 dark:bg-green-900/20"
        style={{ height }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary dark:border-green-700/30 dark:border-t-green-500" />
      </div>
    );
  }

  const largestCount = Math.max(1, ...data.map((item) => item.count));

  return (
    <div
      aria-label="Grade distribution"
      className="flex items-end justify-between gap-2 rounded-lg bg-jungle-tan-dark/10 px-3 pb-4 pt-6 dark:bg-green-900/20"
      role="img"
      style={{ height }}
    >
      {data.map((item) => (
        <div key={item.grade} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-xs text-gray-600 dark:text-green-200/80">
          <span className="font-medium">{item.count}</span>
          <div className="flex h-40 w-full items-end rounded-sm bg-jungle-tan-dark/10 dark:bg-green-950/30">
            <div
              className="w-full rounded-sm bg-primary/75 dark:bg-green-500/70"
              style={{ height: `${(item.count / largestCount) * 100}%` }}
            />
          </div>
          <span>{item.grade}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a GradeChart only once the component scrolls into view.
 * Uses IntersectionObserver with a 200px rootMargin so charts start
 * loading slightly before they become visible (smoother experience).
 */
export default function LazyChart({
  data,
  height = 200,
  mode = "count",
  showDataFallback = false,
}: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-w-0 overflow-hidden" style={{ minHeight: height }}>
      {visible ? (
        <Suspense fallback={<ChartFallback data={data} height={height} showData={showDataFallback} />}>
          <GradeChart data={data} height={height} mode={mode} />
        </Suspense>
      ) : (
        <ChartFallback data={data} height={height} showData={showDataFallback} />
      )}
    </div>
  );
}
