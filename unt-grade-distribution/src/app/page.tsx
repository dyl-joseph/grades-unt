"use client";

import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="home-page flex h-[calc(100dvh-4rem-1px)] flex-col items-center justify-center overflow-hidden px-4">
      {/* Title */}
      <div className="home-title mt-4 mb-8 select-none text-center">
        <p className="sparkle-text select-none text-2xl font-medium tracking-wide text-jungle-vine sm:text-2xl dark:text-ui-accent">
          University of North Texas
        </p>
        <h1 className="sparkle-text sparkle-text-wide select-none text-6xl font-bold text-primary sm:text-7xl dark:text-ui-accent">
          Grade Explorer
        </h1>
        <p className="mt-3 select-none text-xl font-medium tracking-wide text-jungle-bark/70 sm:text-xl dark:text-ui-muted">
          Explore Grades for UNT Classes
        </p>
      </div>

      {/* Search bar — centered, no card */}
      <div className="relative w-full max-w-3xl">
        <SearchBar autoFocus />
      </div>

      {/* Hint */}
      <div className="home-hints mt-4 flex flex-col items-center gap-2 text-center">
        <p className="select-none text-base text-jungle-bark dark:text-ui-muted">
          Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
          (e.g., &ldquo;Moore&rdquo;)
        </p>
        <Link
          href="/terms"
          className="text-sm font-medium text-jungle-vine underline decoration-jungle-vine/50 underline-offset-4 transition hover:text-primary hover:decoration-primary dark:text-ui-muted dark:decoration-ui-accent/50 dark:hover:text-ui-accent"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
