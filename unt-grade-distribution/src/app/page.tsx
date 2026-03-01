"use client";

import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      {/* Title */}
      <div className="mb-10 text-center">
        <p className="text-lg font-medium tracking-wide text-jungle-vine sm:text-xl dark:text-accent/80">
          University of North Texas
        </p>
        <h1 className="text-4xl font-bold text-primary sm:text-6xl dark:text-green-100">
          Grade Explorer
        </h1>
      </div>

      {/* Search bar — centered, no card */}
      <div className="relative w-full max-w-xl">
        <SearchBar autoFocus />
      </div>

      {/* Hint */}
      <p className="mt-8 text-center text-sm text-jungle-bark dark:text-green-300/50">
        Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
        (e.g., &ldquo;Moore&rdquo;)
      </p>
    </div>
  );
}
