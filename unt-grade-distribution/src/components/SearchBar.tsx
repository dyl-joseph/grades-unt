"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchResult } from "@/lib/types";

interface SearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export default function SearchBar({
  placeholder = "Search course or professor...",
  autoFocus = false,
  compact = false,
  onFocusChange,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: SearchResult) => {
        setResults(data);
        setIsOpen(true);
        setHighlightIdx(-1);
      })
      .catch(() => {
        // Abort or network error — ignore
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build flat list of all items for keyboard nav
  const allItems = useCallback(() => {
    if (!results) return [];
    const items: Array<{
      type: "course" | "instructor";
      id: string;
      label: string;
    }> = [];
    results.courses.forEach((c) =>
      items.push({
        type: "course",
        id: `${c.prefix}/${c.number}`,
        label: `${c.prefix} ${c.number} — ${c.title}`,
      })
    );
    results.instructors.forEach((i) =>
      items.push({
        type: "instructor",
        id: String(i.id),
        label: `${i.lastName}, ${i.firstName}`,
      })
    );
    return items;
  }, [results]);

  const navigate = (type: "course" | "instructor", id: string) => {
    setIsOpen(false);
    setQuery("");
    if (type === "course") {
      router.push(`/course/${id}`);
    } else {
      router.push(`/instructor/${id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = allItems();
    if (!isOpen || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      const item = items[highlightIdx];
      navigate(item.type, item.id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const items = allItems();

  return (
    <div ref={containerRef} className={`relative w-full ${compact ? "" : "max-w-xl"}`}>
      <div className="relative">
        <svg
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results) setIsOpen(true);
            onFocusChange?.(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`glass-glossy w-full rounded-2xl border border-white/40 pl-9 pr-4 text-gray-900 shadow-lg placeholder:text-gray-500/70 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 dark:border-white/15 dark:text-green-100 dark:placeholder:text-green-200/40 dark:focus:border-white/25 dark:focus:ring-white/15 ${compact ? "py-1.5 text-sm" : "py-3 pl-10"}`}
        />
      </div>

      {isOpen && items.length > 0 && (
        <div className="glass-glossy absolute z-50 mt-2 w-full rounded-2xl border border-white/40 shadow-xl dark:border-white/15">
          {results!.courses.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-jungle-vine dark:text-accent">
                Courses
              </div>
              {results!.courses.map((course, i) => (
                <button
                  key={`c-${course.id}`}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                    highlightIdx === i
                      ? "bg-green-50 dark:bg-green-900/30"
                      : ""
                  }`}
                  onClick={() =>
                    navigate("course", `${course.prefix}/${course.number}`)
                  }
                >
                  <span className="font-medium text-gray-900 dark:text-green-100">
                    {course.prefix} {course.number}
                  </span>
                  <span className="ml-2 text-gray-500 dark:text-green-300/60">
                    — {course.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results!.instructors.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-jungle-vine dark:text-accent">
                Instructors
              </div>
              {results!.instructors.map((instructor, i) => {
                const idx = results!.courses.length + i;
                return (
                  <button
                    key={`i-${instructor.id}`}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                      highlightIdx === idx
                        ? "bg-green-50 dark:bg-green-900/30"
                        : ""
                    }`}
                    onClick={() =>
                      navigate("instructor", String(instructor.id))
                    }
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {instructor.lastName}, {instructor.firstName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isOpen && items.length === 0 && debouncedQuery.length >= 2 && (
        <div className="glass-glossy absolute z-50 mt-2 w-full rounded-2xl border border-white/40 p-4 text-center text-sm text-gray-500 shadow-xl dark:border-white/15 dark:text-green-200/70">
          No results found for &ldquo;{debouncedQuery}&rdquo;
        </div>
      )}
    </div>
  );
}
