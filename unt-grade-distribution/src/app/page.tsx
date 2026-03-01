"use client";

import { useState, useEffect, useRef } from "react";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  const [searchFocused, setSearchFocused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Collapse hero when clicking outside the hero card
  useEffect(() => {
    if (!searchFocused) return;
    const handler = (e: MouseEvent) => {
      if (heroRef.current && !heroRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchFocused]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      {/* Hero section */}
      <div
        ref={heroRef}
        className={`relative w-full max-w-4xl rounded-2xl bg-gradient-to-br from-jungle-canopy via-primary to-jungle-moss text-center shadow-xl transition-all duration-500 ease-out ${
          searchFocused
            ? "px-6 py-6 sm:px-12 sm:py-8"
            : "px-6 py-16 sm:px-12 sm:py-24"
        }`}
      >
        {/* Leaf pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 5 C25 15, 10 20, 5 30 C10 25, 20 28, 30 20 C40 28, 50 25, 55 30 C50 20, 35 15, 30 5Z\' fill=\'%2300ff00\' fill-opacity=\'0.3\'/%3E%3C/svg%3E")',
            backgroundSize: "60px 60px",
          }}
        />

        {/* Title — slides up and fades when focused */}
        <div
          className={`transition-all duration-500 ease-out ${
            searchFocused
              ? "max-h-0 -translate-y-4 overflow-hidden opacity-0"
              : "max-h-40 translate-y-0 opacity-100"
          }`}
        >
          <h1 className="relative mb-3 text-3xl font-bold text-white sm:text-5xl">
            🌴 UNT Grade Distribution
          </h1>
          <p className="relative mb-8 text-lg text-accent/90 sm:text-xl">
            Explore the jungle of grades
          </p>
        </div>

        {/* Search bar — always visible, lifts to top of card */}
        <div className="relative mx-auto flex max-w-xl justify-center">
          <SearchBar autoFocus onFocusChange={setSearchFocused} />
        </div>
      </div>

      {/* Subtitle — fades when focused */}
      <p
        className={`mt-8 text-center text-sm text-jungle-vine transition-all duration-500 dark:text-accent ${
          searchFocused ? "translate-y-2 opacity-0" : "opacity-100"
        }`}
      >
        Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
        (e.g., &ldquo;Moore&rdquo;)
      </p>
    </div>
  );
}
