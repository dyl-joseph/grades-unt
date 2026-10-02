"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const onStorage = (event: StorageEvent) => {
    if (event.key === "theme") {
      onStoreChange();
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  return {
    isDark,
    chartColors: {
      axisStroke: isDark ? "#acb8b1" : "#374151",
      tooltipBg: isDark ? "#212925" : "#ffffff",
      tooltipBorder: isDark ? "#39453f" : "#e5e7eb",
      tooltipText: isDark ? "#edf1ef" : "#111827",
      gridStroke: isDark ? "#39453f" : "#e5e7eb",
    },
  };
}
