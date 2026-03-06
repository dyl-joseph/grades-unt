"use client";

import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      {/* Title */}
      <div className="mb-12 text-center">
        <p className="sparkle-text text-xl font-medium tracking-wide text-jungle-vine sm:text-2xl dark:text-green-400 dark:[text-shadow:0_0_20px_rgba(85,139,47,0.4),0_0_40px_rgba(85,139,47,0.2)]">
          University of North Texas
        </p>
        <h1 className="sparkle-text sparkle-text-wide text-5xl font-bold text-primary sm:text-7xl dark:text-green-300 dark:[text-shadow:0_0_24px_rgba(27,94,32,0.5),0_0_48px_rgba(27,94,32,0.25)]">
          Grade Explorer
        </h1>
        <p className="mt-3 text-lg font-medium tracking-wide text-jungle-bark/70 sm:text-xl dark:text-green-300/50">
          Explore the jungle of grades
        </p>
      </div>

      {/* Search bar — centered, no card */}
      <div className="relative w-full max-w-2xl">
        <SearchBar autoFocus />
      </div>

      {/* Hint */}
      <p className="mt-10 text-center text-base text-jungle-bark dark:text-green-300/50">
        Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
        (e.g., &ldquo;Moore&rdquo;)
      </p>
    </div>
  );
}
