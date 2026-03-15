"use client";

import { useState, useEffect } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => document.documentElement.classList.contains("dark");
    setIsDark(check());

    const observer = new MutationObserver(() => setIsDark(check()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return {
    isDark,
    chartColors: {
      axisStroke: isDark ? "#d1d5db" : "#374151",
      tooltipBg: isDark ? "#1f2937" : "#ffffff",
      tooltipBorder: isDark ? "#374151" : "#e5e7eb",
      tooltipText: isDark ? "#f9fafb" : "#111827",
      gridStroke: isDark ? "#374151" : "#e5e7eb",
    },
  };
}
