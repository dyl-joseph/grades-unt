"use client";

import Link from "next/link";
import { useState } from "react";
import GpaBadge from "@/components/GpaBadge";
import { isDist } from "@/lib/homeStats";
import MiniDist from "./MiniDist";
import { useHomeStats, useManifestSummary } from "@/hooks/useHomeData";

const INITIAL_COUNT = 24;

export default function DepartmentGrid() {
  const summary = useManifestSummary();
  const stats = useHomeStats();
  const [expanded, setExpanded] = useState(false);

  if (!summary) return null;

  const departments = expanded ? summary.departments : summary.departments.slice(0, INITIAL_COUNT);
  const hiddenCount = summary.departments.length - INITIAL_COUNT;

  return (
    <section id="departments" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-jungle-bark dark:text-ui-text">Browse by department</h2>
        <p className="text-sm text-gray-600 dark:text-ui-muted">
          {summary.departments.length} course prefixes, largest first
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {departments.map((department) => {
          const aggregate = stats?.departments[department.prefix];
          const avgGpa = aggregate?.avgGpa;
          return (
            <li key={department.prefix}>
              <Link
                href={`/department/${encodeURIComponent(department.prefix)}`}
                className="glass-glossy flex h-full flex-col gap-1.5 rounded-2xl border border-white/40 p-3 transition duration-200 hover:border-primary/60 motion-safe:hover:-translate-y-0.5 hover:shadow-lg dark:border-ui-border dark:hover:border-ui-accent"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-lg font-bold text-primary dark:text-ui-accent">
                    {department.prefix}
                  </span>
                  {typeof avgGpa === "number" && <GpaBadge gpa={avgGpa} />}
                </span>
                <span className="text-xs text-gray-600 dark:text-ui-muted">
                  {department.courses.toLocaleString()} course{department.courses === 1 ? "" : "s"}
                </span>
                {isDist(aggregate?.dist) && <MiniDist dist={aggregate.dist} className="mt-auto" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-4 rounded-lg border border-jungle-tan-dark/30 bg-jungle-tan-light px-4 py-2 text-sm font-medium text-jungle-bark transition-colors hover:border-primary/50 hover:text-primary dark:border-ui-border dark:bg-ui-surface dark:text-ui-text dark:hover:border-ui-accent"
        >
          {expanded ? "Show fewer" : `Show all ${summary.departments.length} departments`}
        </button>
      )}
    </section>
  );
}
