"use client";

import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default function HomeClient() {
  return (
    <div className="home-page flex h-[calc(100dvh-4rem-1px)] flex-col items-center justify-center overflow-hidden px-4">
      {/* Title */}
      <div className="home-title mt-4 mb-8 select-none text-center">
        <p className="select-none text-2xl font-medium tracking-wide sm:text-2xl text-ui-accent">
          University of North Texas
        </p>
        <h1 className="select-none text-6xl font-bold sm:text-7xl text-ui-accent">
          Grade Explorer
        </h1>
        <p className="mt-3 select-none text-xl font-medium tracking-wide sm:text-xl text-ui-muted">
          Explore Grades for UNT Classes
        </p>
      </div>

      {/* Search bar — centered, no card */}
      <div className="relative w-full max-w-3xl">
        <SearchBar />
      </div>

      {/* Hint */}
      <div className="home-hints mt-4 flex flex-col items-center gap-2 text-center">
        <p className="select-none text-base text-ui-muted">
          Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
          (e.g., &ldquo;Moore&rdquo;)
        </p>
        <Link
          href="/terms"
          className="text-sm font-medium underline underline-offset-4 transition hover:decoration-ui-accent text-ui-muted decoration-ui-accent/50 hover:text-ui-accent"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
