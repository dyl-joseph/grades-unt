"use client";

import { useEffect, useState } from "react";
import { fetchManifest } from "@/lib/encryptedData";
import { loadHomeStats, summarizeManifest, type HomeStats, type ManifestSummary } from "@/lib/homeStats";

/** Null until the manifest loads, and stays null if it fails (callers hide their section). */
export function useManifestSummary() {
  const [summary, setSummary] = useState<ManifestSummary | null>(null);

  useEffect(() => {
    let active = true;
    fetchManifest()
      .then((manifest) => {
        if (active) setSummary(summarizeManifest(manifest));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return summary;
}

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
