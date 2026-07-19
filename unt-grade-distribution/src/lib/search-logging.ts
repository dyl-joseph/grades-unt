import { getSearchPlan, normalizeSearchQuery } from "@/lib/search";
import type { SearchResult } from "@/lib/types";

type SearchLogSource = "site" | "compare" | "api" | "other";
type SearchLogKind = "course" | "instructor" | "mixed" | "unknown";

type SearchLogArgs = {
  rawQuery: string;
  source: SearchLogSource;
  results: Pick<SearchResult, "courses" | "instructors">;
};

type SearchLogPayload = {
  rawQuery?: string;
  normalizedQuery?: string;
  searchKind: SearchLogKind;
  source: SearchLogSource;
  coursePrefix?: string;
  courseNumber?: string;
  courseTitle?: string;
  resultCountCourses: number;
  resultCountInstructors: number;
};

function resolveSearchKind(rawQuery: string, results: Pick<SearchResult, "courses" | "instructors">): SearchLogKind {
  const plan = getSearchPlan(rawQuery);
  if (plan.queryKind === "course") return "course";
  if (results.courses.length > 0 && results.instructors.length > 0) return "mixed";
  if (results.instructors.length > 0) return "instructor";
  if (results.courses.length > 0) return "course";
  return "unknown";
}

function buildPayload(args: SearchLogArgs): SearchLogPayload | null {
  if (args.rawQuery.trim().length < 2) return null;

  const normalizedQuery = normalizeSearchQuery(args.rawQuery);
  const plan = getSearchPlan(args.rawQuery);
  const searchKind = resolveSearchKind(args.rawQuery, args.results);
  const course = args.results.courses[0];
  const isCourseSearch = searchKind === "course";

  return {
    rawQuery: isCourseSearch ? args.rawQuery : undefined,
    normalizedQuery: isCourseSearch ? normalizedQuery : undefined,
    searchKind,
    source: args.source,
    coursePrefix: isCourseSearch ? course?.prefix ?? (plan.queryKind === "course" ? plan.prefix : undefined) : undefined,
    courseNumber: isCourseSearch ? course?.number ?? (plan.queryKind === "course" ? plan.number : undefined) : undefined,
    courseTitle: isCourseSearch ? course?.title : undefined,
    resultCountCourses: args.results.courses.length,
    resultCountInstructors: args.results.instructors.length,
  };
}

export async function logSearchEvent(args: SearchLogArgs) {
  const payload = buildPayload(args);
  if (!payload) return;

  try {
    await fetch("/api/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Search logging must never block the UI.
  }
}
