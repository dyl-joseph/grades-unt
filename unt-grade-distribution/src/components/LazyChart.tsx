"use client";

import { useRef, useState, useEffect } from "react";
import GradeChart from "./GradeChart";
import type { ChartDataPoint } from "@/lib/grades";

interface LazyChartProps {
  data: ChartDataPoint[];
  height?: number;
  mode?: "count" | "percentage";
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
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? (
        <GradeChart data={data} height={height} mode={mode} />
      ) : (
        <div
          className="flex items-center justify-center rounded-lg bg-jungle-tan-dark/10 dark:bg-green-900/20"
          style={{ height }}
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary dark:border-green-700/30 dark:border-t-green-500" />
        </div>
      )}
    </div>
  );
}
