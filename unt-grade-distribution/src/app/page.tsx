"use client";

import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex h-[calc(100dvh-4rem-1px)] flex-col items-center justify-center overflow-hidden px-4">
      {/* Title */}
      <div className="mt-4 mb-8 select-none text-center">
        <p className="sparkle-text select-none text-2xl font-medium tracking-wide text-jungle-vine sm:text-2xl dark:text-green-400 dark:[text-shadow:0_0_20px_rgba(85,139,47,0.4),0_0_40px_rgba(85,139,47,0.2)]">
          University of North Texas
        </p>
        <h1 className="sparkle-text sparkle-text-wide select-none text-6xl font-bold text-primary sm:text-7xl dark:text-green-300 dark:[text-shadow:0_0_24px_rgba(27,94,32,0.5),0_0_48px_rgba(27,94,32,0.25)]">
          Grade Explorer
        </h1>
        <p className="mt-3 select-none text-xl font-medium tracking-wide text-jungle-bark/70 sm:text-xl dark:text-green-300/50">
          Explore Grades for UNT Classes
        </p>
      </div>

      {/* Search bar — centered, no card */}
      <div className="relative w-full max-w-3xl">
        <SearchBar autoFocus />
      </div>

      {/* Hint */}
      <p className="mt-10 select-none text-center text-base text-jungle-bark dark:text-green-300/50">
        Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
        (e.g., &ldquo;Moore&rdquo;)
      </p>
    </div>
  );
}
