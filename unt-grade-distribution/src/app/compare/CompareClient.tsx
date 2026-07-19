"use client";

import React, { useCallback, useEffect, useState } from "react";
import { aggregateGrades, calculateGPA, toChartData, type ChartDataPoint } from "@/lib/grades";
import GradeChart from "@/components/GradeChart";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchResult } from "@/lib/types";
import { fetchManifest, fromInstructorSlug, loadCourseByCode, loadInstructorSections, searchManifest } from "@/lib/encryptedData";

type CompareType = "course" | "instructor";
type CourseSuggestion = SearchResult["courses"][number];
type InstructorSuggestion = SearchResult["instructors"][number];
type Suggestion = CourseSuggestion | InstructorSuggestion;
type Selection = Suggestion | string | null;

type CompareData = {
  label: string;
  chartData: ChartDataPoint[];
  summary: {
    sections: number;
    students: number;
    gpa: number | null;
  };
};

type CompareClientProps = {
  initialType?: string;
  initialA?: string;
};

function isCourseSuggestion(item: Suggestion): item is CourseSuggestion {
  return "prefix" in item && "number" in item;
}

function isInstructorSuggestion(item: Suggestion): item is InstructorSuggestion {
  return !isCourseSuggestion(item);
}

function initialCompareType(value?: string): CompareType {
  return value === "instructor" ? "instructor" : "course";
}

function oppositeType(value: CompareType): CompareType {
  return value === "course" ? "instructor" : "course";
}

function toSectionModels(course: {
  prefix: string;
  number: string;
  title: string;
  sections: Array<{
    sectionNumber: string;
    instructor: { firstName: string; lastName: string };
    grades: { A: number; B: number; C: number; D: number; F: number; P: number; NP: number; W: number; I: number };
  }>;
}) {
  return course.sections.map((section, index) => ({
    id: `${course.prefix}-${course.number}-${section.sectionNumber}-${index}`,
    sectionNumber: section.sectionNumber,
    instructor: section.instructor,
    course: { prefix: course.prefix, number: course.number, title: course.title },
    gradeA: section.grades.A,
    gradeB: section.grades.B,
    gradeC: section.grades.C,
    gradeD: section.grades.D,
    gradeF: section.grades.F,
    gradeP: section.grades.P,
    gradeNP: section.grades.NP,
    gradeW: section.grades.W,
    gradeI: section.grades.I,
    totalEnroll:
      section.grades.A +
      section.grades.B +
      section.grades.C +
      section.grades.D +
      section.grades.F +
      section.grades.P +
      section.grades.NP +
      section.grades.W +
      section.grades.I,
  }));
}

function selectionLabel(type: CompareType, selection: Selection, dataLabel?: string) {
  if (dataLabel) return dataLabel;
  if (!selection) return "";

  if (typeof selection === "string") {
    if (type === "course") {
      const [prefix, number] = selection.split(":");
      return prefix && number ? `${prefix} ${number}` : selection;
    }

    const parsed = fromInstructorSlug(selection);
    return parsed.firstName && parsed.lastName ? `${parsed.firstName} ${parsed.lastName}` : selection;
  }

  if (type === "course" && isCourseSuggestion(selection)) {
    return `${selection.prefix} ${selection.number} — ${selection.title}`;
  }

  if (type === "instructor" && isInstructorSuggestion(selection)) {
    return `${selection.firstName} ${selection.lastName}`;
  }

  return "";
}

async function loadSelectionData(type: CompareType, selection: Selection): Promise<CompareData | null> {
  if (!selection) return null;

  if (type === "course") {
    let prefix = "";
    let number = "";

    if (typeof selection === "string") {
      [prefix, number] = selection.split(":");
    } else if (isCourseSuggestion(selection)) {
      prefix = selection.prefix;
      number = selection.number;
    }

    if (!prefix || !number) return null;
    const course = await loadCourseByCode(prefix, number);
    if (!course) return null;

    const sections = toSectionModels(course);
    const aggregate = aggregateGrades(sections);
    return {
      label: `${course.prefix} ${course.number} — ${course.title}`,
      chartData: toChartData(aggregate),
      summary: {
        sections: sections.length,
        students: aggregate.totalEnroll,
        gpa: calculateGPA(aggregate),
      },
    };
  }

  let firstName = "";
  let lastName = "";

  if (typeof selection === "string") {
    const parsed = fromInstructorSlug(selection);
    firstName = parsed.firstName;
    lastName = parsed.lastName;
  } else if (isInstructorSuggestion(selection)) {
    firstName = selection.firstName;
    lastName = selection.lastName;
  }

  if (!firstName || !lastName) return null;

  const rows = await loadInstructorSections(firstName, lastName);
  if (!rows.length) return null;

  const sections = rows.map((row, index) => ({
    id: `${row.course.prefix}-${row.course.number}-${row.sectionNumber}-${index}`,
    sectionNumber: row.sectionNumber,
    instructor: row.instructor,
    course: row.course,
    gradeA: row.grades.A,
    gradeB: row.grades.B,
    gradeC: row.grades.C,
    gradeD: row.grades.D,
    gradeF: row.grades.F,
    gradeP: row.grades.P,
    gradeNP: row.grades.NP,
    gradeW: row.grades.W,
    gradeI: row.grades.I,
    totalEnroll:
      row.grades.A +
      row.grades.B +
      row.grades.C +
      row.grades.D +
      row.grades.F +
      row.grades.P +
      row.grades.NP +
      row.grades.W +
      row.grades.I,
  }));

  const aggregate = aggregateGrades(sections);
  return {
    label: `${firstName} ${lastName}`,
    chartData: toChartData(aggregate),
    summary: {
      sections: sections.length,
      students: aggregate.totalEnroll,
      gpa: calculateGPA(aggregate),
    },
  };
}

function ComparePanel({
  title,
  kind,
  onKindChange,
  query,
  onQueryChange,
  loadingResults,
  results,
  focused,
  onFocusChange,
  selected,
  data,
  loadingData,
  error,
  onSelect,
  onClear,
}: {
  title: string;
  kind: CompareType;
  onKindChange: (kind: CompareType) => void;
  query: string;
  onQueryChange: (query: string) => void;
  loadingResults: boolean;
  results: Suggestion[];
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  selected: Selection;
  data: CompareData | null;
  loadingData: boolean;
  error: string | null;
  onSelect: (item: Suggestion) => void;
  onClear: () => void;
}) {
  const hasQuery = query.trim().length >= 2;
  const open = focused && hasQuery && (loadingResults || results.length > 0 || !!error);

  return (
    <section className="rounded-[28px] border border-jungle-tan-dark/30 bg-jungle-tan-light/90 p-5 shadow-[0_20px_60px_rgba(27,94,32,0.08)] backdrop-blur dark:border-green-900/50 dark:bg-jungle-canopy/70 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jungle-vine/80 dark:text-green-300/70">{title}</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-green-100">
            Compare {kind === "course" ? "courses" : "professors"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-jungle-tan-dark/30 px-3 py-1.5 text-sm font-semibold text-jungle-bark transition hover:border-primary/40 hover:bg-white/60 hover:text-primary dark:border-green-800/60 dark:text-green-100 dark:hover:bg-green-950/40"
        >
          Clear
        </button>
      </div>

      <div className="mb-4">
        <div className="relative grid h-12 grid-cols-2 rounded-full border border-jungle-tan-dark/30 bg-white/60 p-1 text-sm shadow-sm dark:border-green-800/60 dark:bg-green-950/30">
          <span
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-md transition-transform duration-300 ease-out dark:bg-green-400 ${
              kind === "instructor" ? "translate-x-full" : "translate-x-0"
            }`}
            aria-hidden="true"
          />
          {(["course", "instructor"] as CompareType[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onKindChange(value)}
              className={`relative z-10 flex items-center justify-center rounded-full px-4 font-semibold transition-colors duration-300 ${
                kind === value
                  ? "text-white dark:text-jungle-canopy"
                  : "text-jungle-bark hover:text-primary dark:text-green-100 dark:hover:text-green-50"
              }`}
            >
              {value === "course" ? "Courses" : "Professors"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder={`Search ${kind === "course" ? "course code or title" : "professor name"}`}
          className="w-full rounded-2xl border border-jungle-tan-dark/30 bg-white/85 px-4 py-3 pr-11 text-gray-900 shadow-inner outline-none ring-0 transition placeholder:text-gray-500 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:border-green-800/60 dark:bg-jungle-canopy/80 dark:text-green-100 dark:placeholder:text-green-200/40 dark:focus:border-green-400/50 dark:focus:ring-green-500/20"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {loadingResults ? (
            <svg className="h-4 w-4 animate-spin text-jungle-vine dark:text-green-300/70" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-jungle-vine/70 dark:text-green-300/60">
              {kind === "course" ? "CRS" : "PROF"}
            </span>
          )}
        </div>

        {open && (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-jungle-tan-dark/30 bg-[#F8F4EE] shadow-2xl dark:border-green-800/60 dark:bg-jungle-canopy/95">
            {error ? (
              <div className="px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-green-200/70">No results found.</div>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(item)}
                  className="flex w-full items-center gap-3 border-b border-jungle-tan-dark/10 px-4 py-3 text-left transition last:border-b-0 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-950/50"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-green-400/15 dark:text-green-300">
                    {kind === "course"
                      ? isCourseSuggestion(item)
                        ? item.prefix
                        : "CR"
                      : isInstructorSuggestion(item)
                        ? item.lastName.slice(0, 1)
                        : "PR"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900 dark:text-green-100">
                      {kind === "course" && isCourseSuggestion(item)
                        ? `${item.prefix} ${item.number}`
                        : kind === "instructor" && isInstructorSuggestion(item)
                          ? `${item.lastName}, ${item.firstName}`
                          : "Result"}
                    </span>
                    <span className="block truncate text-sm text-gray-500 dark:text-green-200/70">
                      {kind === "course" && isCourseSuggestion(item)
                        ? item.title
                        : kind === "instructor" && isInstructorSuggestion(item)
                          ? "Professor"
                          : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mb-4 min-h-12 rounded-2xl border border-dashed border-jungle-tan-dark/35 bg-white/40 px-4 py-3 dark:border-green-800/60 dark:bg-green-950/20">
        {selected ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-green-400 dark:text-jungle-canopy">
              Selected
            </span>
            <span className="font-semibold text-gray-900 dark:text-green-100">
              {selectionLabel(kind, selected, data?.label)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-green-200/60">
            Pick a {kind === "course" ? "course" : "professor"} to load the distribution.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-jungle-tan-dark/25 bg-[#FBF8F3] p-4 dark:border-green-900/50 dark:bg-jungle-canopy/60">
        {loadingData ? (
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-44 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="h-[260px] rounded-2xl bg-jungle-tan-dark/15 dark:bg-green-950/30" />
          </div>
        ) : data ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-green-100">{data.label}</h3>
                <p className="text-sm text-gray-500 dark:text-green-200/70">
                  {data.summary.sections} sections · {data.summary.students.toLocaleString()} students · GPA {data.summary.gpa === null ? "N/A" : data.summary.gpa.toFixed(2)}
                </p>
              </div>
            </div>
            <GradeChart data={data.chartData} height={280} mode="percentage" />
          </>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-jungle-tan-dark/30 bg-white/40 text-center dark:border-green-800/50 dark:bg-green-950/15">
            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-green-100">No comparison loaded</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-green-200/60">
                Search and select a {kind === "course" ? "course" : "professor"} above.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function useCompareSide(initialKind: CompareType, initialSelection: Selection) {
  const [kind, setKind] = useState<CompareType>(initialKind);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<Selection>(initialSelection);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState<CompareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 200);

  const clear = useCallback(() => {
    setQuery("");
    setFocused(false);
    setSelected(null);
    setResults([]);
    setLoadingResults(false);
    setLoadingData(false);
    setData(null);
    setError(null);
  }, []);

  const onKindChange = useCallback(
    (nextKind: CompareType) => {
      if (nextKind === kind) return;
      setKind(nextKind);
      clear();
    },
    [clear, kind]
  );

  const onSelect = useCallback((item: Suggestion) => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase().replace(/\s+/g, " ");
    const isCourse = isCourseSuggestion(item);
    void fetch("/api/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawQuery: isCourse ? debouncedQuery : undefined,
        normalizedQuery: isCourse ? normalizedQuery : undefined,
        searchKind: isCourse ? "course" : "instructor",
        source: "compare",
        coursePrefix: isCourse ? item.prefix : undefined,
        courseNumber: isCourse ? item.number : undefined,
        courseTitle: isCourse ? item.title : undefined,
        resultCountCourses: kind === "course" ? results.length : 0,
        resultCountInstructors: kind === "instructor" ? results.length : 0,
      }),
      keepalive: true,
    });

    setSelected(item);
    setQuery("");
    setFocused(false);
    setResults([]);
    setError(null);
  }, [debouncedQuery, kind, results]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoadingResults(false);
      setError(null);
      return;
    }

    let active = true;
    setLoadingResults(true);
    setError(null);

    searchManifest(trimmed)
      .then((result) => {
        if (!active) return;
        setResults(kind === "course" ? result.courses : result.instructors);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setResults([]);
        setError(cause instanceof Error ? cause.message : "Failed to search compare options");
      })
      .finally(() => {
        if (active) setLoadingResults(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, kind]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!selected) {
        setData(null);
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      setError(null);
      try {
        const nextData = await loadSelectionData(kind, selected);
        if (!active) return;
        setData(nextData);
        if (!nextData) setError("That selection could not be loaded.");
      } catch (cause: unknown) {
        if (!active) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : "Failed to load comparison data");
      } finally {
        if (active) setLoadingData(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [kind, selected]);

  return {
    kind,
    onKindChange,
    query,
    setQuery,
    focused,
    setFocused,
    selected,
    data,
    loadingResults,
    loadingData,
    results,
    error,
    onSelect,
    clear,
  };
}

export default function CompareClient({ initialType, initialA }: CompareClientProps) {
  useEffect(() => {
    void fetchManifest().catch(() => undefined);
  }, []);

  const leftType = initialCompareType(initialType);
  const rightType = oppositeType(leftType);
  const initialSelection = initialA?.trim() ? initialA.trim() : null;

  const left = useCompareSide(leftType, initialSelection);
  const right = useCompareSide(rightType, null);

  return (
    <main className="relative min-h-[calc(100dvh-4rem-1px)] overflow-hidden px-4 py-8 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-80">
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-green-400/15 blur-3xl" />
        <div className="absolute right-[-8%] top-[18%] h-80 w-80 rounded-full bg-jungle-gold/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[20%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-green-100 sm:text-5xl lg:text-6xl">
            Compare anything in one place.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gray-600 dark:text-green-200/75 sm:text-lg">
            Put courses and professors side by side. Switch either panel to what you want to inspect.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <ComparePanel
            title="Left side"
            kind={left.kind}
            onKindChange={left.onKindChange}
            query={left.query}
            onQueryChange={left.setQuery}
            loadingResults={left.loadingResults}
            results={left.results}
            focused={left.focused}
            onFocusChange={left.setFocused}
            selected={left.selected}
            data={left.data}
            loadingData={left.loadingData}
            error={left.error}
            onSelect={left.onSelect}
            onClear={left.clear}
          />

          <div className="flex items-center justify-center lg:min-h-full">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-jungle-tan-dark/25 bg-white/80 text-lg font-black text-primary shadow-lg dark:border-green-800/60 dark:bg-jungle-canopy/90 dark:text-green-300">
              VS
            </div>
          </div>

          <ComparePanel
            title="Right side"
            kind={right.kind}
            onKindChange={right.onKindChange}
            query={right.query}
            onQueryChange={right.setQuery}
            loadingResults={right.loadingResults}
            results={right.results}
            focused={right.focused}
            onFocusChange={right.setFocused}
            selected={right.selected}
            data={right.data}
            loadingData={right.loadingData}
            error={right.error}
            onSelect={right.onSelect}
            onClear={right.clear}
          />
        </div>

        <div className="mx-auto max-w-4xl rounded-3xl border border-jungle-tan-dark/25 bg-white/70 px-5 py-4 text-sm text-gray-600 shadow-sm backdrop-blur dark:border-green-900/40 dark:bg-jungle-canopy/60 dark:text-green-200/75">
          Start with a course or professor on either side, then switch panels independently if you want a mixed comparison.
        </div>
      </div>
    </main>
  );
}
