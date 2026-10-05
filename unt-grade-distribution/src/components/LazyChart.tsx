"use client";

import { lazy, Suspense, useRef, useState, useEffect } from "react";
import type { ChartDataPoint } from "@/lib/grades";

const loadGradeChart = () => import("./GradeChart");
const GradeChart = lazy(loadGradeChart);

/** Starts downloading the chart chunk ahead of the first render. */
export function preloadGradeChart() {
  void loadGradeChart();
}

interface LazyChartProps {
  data: ChartDataPoint[];
  height?: number;
  mode?: "count" | "percentage";
  /** Render immediately instead of waiting to scroll into view (for above-the-fold charts). */
  priority?: boolean;
}

function ChartFallback({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-jungle-tan-dark/10 dark:bg-ui-selected"
      style={{ height }}
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary dark:border-ui-border dark:border-t-ui-accent" />
    </div>
  );
}

/**
 * Renders a GradeChart only once the component scrolls into view.
 * Uses IntersectionObserver with a 200px rootMargin so charts start
 * loading slightly before they become visible (smoother experience).
 * Pass `priority` for charts in the initial viewport to skip the observer.
 */
export default function LazyChart({
  data,
  height = 200,
  mode = "count",
  priority = false,
}: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

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
  }, [visible]);

  return (
    <div ref={ref} className="min-w-0 overflow-hidden" style={{ minHeight: height }}>
      {visible ? (
        <Suspense fallback={<ChartFallback height={height} />}>
          <GradeChart data={data} height={height} mode={mode} />
        </Suspense>
      ) : (
        <ChartFallback height={height} />
      )}
    </div>
  );
}
