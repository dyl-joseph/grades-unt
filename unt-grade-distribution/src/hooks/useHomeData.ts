"use client";

import { useEffect, useState } from "react";
import { loadHomeStats, type HomeStats } from "@/lib/homeStats";

/** Null until loaded, and stays null when the aggregate file is absent. */
export function useHomeStats() {
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    let active = true;
    loadHomeStats().then((value) => {
      if (active) setStats(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return stats;
}
