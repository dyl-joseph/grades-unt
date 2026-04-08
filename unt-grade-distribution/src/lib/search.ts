import { formatServerTiming } from "@/lib/metrics";

export type SearchQueryKind = "skip" | "course" | "name";
export type SearchResultKind = Exclude<SearchQueryKind, "skip">;
export type SearchCacheState = "skip" | "hit" | "miss" | "error";

export function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getSearchPlan(query: string) {
  const cacheKey = normalizeSearchQuery(query);
  const isCourseQuery = /^[A-Za-z]{1,4}\s?\d/.test(query);
  const courseTake = isCourseQuery ? 10 : 5;
  const instructorTake = isCourseQuery ? 5 : 10;

  let prefix = "";
  let number = "";

  if (isCourseQuery) {
    const match = query.match(/^([A-Za-z]{1,4})\s?(\d.*)?$/);
    prefix = match?.[1]?.toUpperCase() ?? "";
    number = match?.[2]?.replace(/^\s+/, "") ?? "";
  }

  return {
    cacheKey,
    courseTake,
    instructorTake,
    prefix,
    number,
    queryKind: (isCourseQuery ? "course" : "name") as SearchResultKind,
  };
}

export function buildSearchHeaders(args: {
  totalDurationMs: number;
  dbDurationMs?: number;
  cacheState: SearchCacheState;
  queryKind: SearchQueryKind;
  resultCounts?: { courses: number; instructors: number };
}) {
  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=1800",
    "Server-Timing": formatServerTiming([
      { name: "search", description: args.cacheState, durationMs: args.totalDurationMs },
      ...(typeof args.dbDurationMs === "number" ? [{ name: "db", durationMs: args.dbDurationMs }] : []),
    ]),
    "x-search-cache": args.cacheState,
    "x-search-kind": args.queryKind,
  };

  if (args.resultCounts) {
    headers["x-search-courses"] = String(args.resultCounts.courses);
    headers["x-search-instructors"] = String(args.resultCounts.instructors);
  }

  return headers;
}
