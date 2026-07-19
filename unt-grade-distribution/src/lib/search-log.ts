export type SearchKind = "course" | "instructor" | "mixed" | "unknown";
export type SearchSource = "site" | "compare" | "api" | "other";

export type SearchLogPayload = {
  rawQuery?: unknown;
  normalizedQuery?: unknown;
  searchKind?: unknown;
  source?: unknown;
  coursePrefix?: unknown;
  courseNumber?: unknown;
  courseTitle?: unknown;
  resultCountCourses?: unknown;
  resultCountInstructors?: unknown;
};

export type SearchLogRow = {
  raw_query: string | null;
  normalized_query: string | null;
  search_kind: SearchKind;
  source: SearchSource;
  course_prefix: string | null;
  course_number: string | null;
  course_title: string | null;
  result_count_courses: number;
  result_count_instructors: number;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function isSearchKind(value: unknown): value is SearchKind {
  return value === "course" || value === "instructor" || value === "mixed" || value === "unknown";
}

function isSearchSource(value: unknown): value is SearchSource {
  return value === "site" || value === "compare" || value === "api" || value === "other";
}

function normalizeQuery(rawQuery: string) {
  return rawQuery.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildSearchLogRow(payload: SearchLogPayload): SearchLogRow | null {
  const searchKind = isSearchKind(payload.searchKind) ? payload.searchKind : "unknown";
  const source = isSearchSource(payload.source) ? payload.source : "site";
  const isCourseSearch = searchKind === "course";
  const rawQuery = asTrimmedString(payload.rawQuery);

  // Instructor and mixed searches retain no identifying text or selected-instructor fields.
  if (isCourseSearch && !rawQuery) return null;

  return {
    raw_query: isCourseSearch ? rawQuery : null,
    normalized_query: isCourseSearch ? asTrimmedString(payload.normalizedQuery) ?? normalizeQuery(rawQuery!) : null,
    search_kind: searchKind,
    source,
    course_prefix: isCourseSearch ? asTrimmedString(payload.coursePrefix) : null,
    course_number: isCourseSearch ? asTrimmedString(payload.courseNumber) : null,
    course_title: isCourseSearch ? asTrimmedString(payload.courseTitle) : null,
    result_count_courses: asInteger(payload.resultCountCourses),
    result_count_instructors: asInteger(payload.resultCountInstructors),
  };
}
