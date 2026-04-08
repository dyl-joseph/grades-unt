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

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const MAX_CLIENT_CACHE_ENTRIES = 25;

export default function SearchBar({
  placeholder = "Search course, professor, or class code...",
  autoFocus = false,
  compact = false,
  onFocusChange,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clientCache = useRef(new Map<string, SearchResult>());

  const normalizeQuery = useCallback((value: string) => value.trim().toLowerCase(), []);

  const rememberResult = useCallback((key: string, value: SearchResult) => {
    const cache = clientCache.current;
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    if (cache.size > MAX_CLIENT_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }, []);

  const resetResults = useCallback(() => {
    setResults(null);
    setIsOpen(false);
    setHighlightIdx(-1);
    setLoading(false);
    setError(null);
  }, []);

  // Fetch results when debounced query changes
  useEffect(() => {
    const normalized = normalizeQuery(debouncedQuery);
    if (normalized.length < MIN_QUERY_LENGTH) return;

    const cached = clientCache.current.get(normalized);
    if (cached) {
      setResults(cached);
      setIsOpen(true);
      setHighlightIdx(-1);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Search request failed (${res.status})`);
        }
        return (await res.json()) as SearchResult;
      })
      .then((data) => {
        if (!active) return;
        rememberResult(normalized, data);
        setResults(data);
        setIsOpen(true);
        setHighlightIdx(-1);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoading(false);
        setError(cause instanceof Error ? cause.message : "Search request failed");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery, normalizeQuery, rememberResult]);

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
    const navId = `${type}-${id}`;
    setNavigatingId(navId);
    setIsOpen(false);
    setQuery("");
    resetResults();
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
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIdx = highlightIdx >= 0 ? highlightIdx : 0;
      const item = items[targetIdx];
      if (item) navigate(item.type, item.id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const items = allItems();
  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className={`relative w-full ${compact ? "" : "max-w-3xl mx-auto"}`}>
      <div className="relative">
        <svg
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${compact ? "h-4 w-4" : "h-6 w-6 left-4"}`}
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
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setError(null);
            if (normalizeQuery(value).length < MIN_QUERY_LENGTH) {
              resetResults();
            } else {
              setLoading(true);
            }
          }}
          onFocus={() => {
            if (results) setIsOpen(true);
            onFocusChange?.(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-busy={loading}
          aria-invalid={error ? "true" : undefined}
          className={`w-full rounded-2xl border pl-9 pr-9 text-gray-900 placeholder:text-gray-500/70 focus:outline-none focus:ring-2 ${compact ? "border-jungle-tan-dark/30 bg-jungle-tan-light py-1.5 text-sm shadow-sm focus:border-primary/40 focus:ring-primary/20 dark:border-green-800/50 dark:bg-jungle-canopy dark:focus:border-green-600/50 dark:focus:ring-green-700/30" : "glass-glossy border-white/40 py-4 pl-12 text-lg shadow-lg focus:border-white/60 focus:ring-white/40 dark:border-white/15 dark:focus:border-white/25 dark:focus:ring-white/15"} dark:text-green-100 dark:placeholder:text-green-200/40`}
        />
        {loading && hasQuery && (
          <svg
            className={`absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400 dark:text-green-300/60 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {isOpen && items.length > 0 && (
        <div className={`absolute z-50 mt-2 w-full rounded-2xl border shadow-xl ${compact ? "border-jungle-tan-dark/30 bg-jungle-tan-light dark:border-green-800/50 dark:bg-jungle-canopy" : "glass-glossy border-white/40 dark:border-white/15"}`}>
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
                  disabled={navigatingId !== null}
                >
                  <span className="font-medium text-gray-900 dark:text-green-100">
                    {course.prefix} {course.number}
                  </span>
                  <span className="ml-2 text-gray-500 dark:text-green-300/60">
                    — {course.title}
                  </span>
                  {navigatingId === `course-${course.prefix}/${course.number}` && (
                    <svg className="ml-auto h-4 w-4 animate-spin text-gray-400 dark:text-green-300/60" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
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
                    disabled={navigatingId !== null}
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {instructor.lastName}, {instructor.firstName}
                    </span>
                    {navigatingId === `instructor-${instructor.id}` && (
                      <svg className="ml-auto h-4 w-4 animate-spin text-gray-400 dark:text-green-300/60" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {isOpen && !loading && error && hasQuery && (
        <div className={`absolute z-50 mt-2 w-full rounded-2xl border p-4 text-center text-sm text-red-600 shadow-xl dark:text-red-300 ${compact ? "border-jungle-tan-dark/30 bg-jungle-tan-light dark:border-green-800/50 dark:bg-jungle-canopy" : "glass-glossy border-white/40 dark:border-white/15"}`}>
          Could not load search results. Please try again.
        </div>
      )}
      {isOpen && !loading && !error && items.length === 0 && hasQuery && (
        <div className={`absolute z-50 mt-2 w-full rounded-2xl border p-4 text-center text-sm text-gray-500 shadow-xl dark:text-green-200/70 ${compact ? "border-jungle-tan-dark/30 bg-jungle-tan-light dark:border-green-800/50 dark:bg-jungle-canopy" : "glass-glossy border-white/40 dark:border-white/15"}`}>
          No results found for &ldquo;{debouncedQuery}&rdquo;
        </div>
      )}
    </div>
  );
}
