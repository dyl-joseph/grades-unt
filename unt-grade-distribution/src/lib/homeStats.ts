import type { ManifestEntry } from "./encryptedData";

export type DepartmentSummary = {
  prefix: string;
  courses: number;
};

export type ManifestSummary = {
  courses: number;
  departments: DepartmentSummary[];
};

export type RankedCourse = {
  prefix: string;
  number: string;
  title: string;
  gpa: number;
  dfwRate: number;
  students: number;
  /** Percent of A, B, C, D, F, W. Absent in files written before the grade bars existed. */
  dist?: number[];
};

/** Aggregates written by tools/encrypt-data.js next to the manifest. */
export type HomeStats = {
  minStudents: number;
  departments: Record<string, { avgGpa: number | null; students: number; dist?: number[] }>;
  easiest: RankedCourse[];
  hardest: RankedCourse[];
};

function courseKey(entry: ManifestEntry) {
  return `${entry.preview.prefix}|${entry.preview.number}`;
}

export function summarizeManifest(manifest: ManifestEntry[]): ManifestSummary {
  const seen = new Set<string>();
  const byPrefix = new Map<string, number>();

  for (const entry of manifest) {
    const key = courseKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    byPrefix.set(entry.preview.prefix, (byPrefix.get(entry.preview.prefix) ?? 0) + 1);
  }

  const departments = Array.from(byPrefix, ([prefix, courses]) => ({ prefix, courses })).sort(
    (a, b) => b.courses - a.courses || a.prefix.localeCompare(b.prefix)
  );

  return {
    courses: seen.size,
    departments,
  };
}

export function coursesInDepartment(manifest: ManifestEntry[], prefix: string) {
  const wanted = prefix.trim().toUpperCase();
  const seen = new Set<string>();
  const courses: Array<{ prefix: string; number: string; title: string }> = [];

  for (const entry of manifest) {
    if (entry.preview.prefix.toUpperCase() !== wanted) continue;
    const key = courseKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    courses.push(entry.preview);
  }

  return courses.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

export function isDist(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 6 && value.every((part) => typeof part === "number");
}

function isRankedCourse(value: unknown): value is RankedCourse {
  if (typeof value !== "object" || value === null) return false;
  const course = value as Record<string, unknown>;
  return (
    typeof course.prefix === "string" &&
    typeof course.number === "string" &&
    typeof course.title === "string" &&
    typeof course.gpa === "number" &&
    typeof course.dfwRate === "number" &&
    typeof course.students === "number" &&
    (course.dist === undefined || isDist(course.dist))
  );
}

export function parseHomeStats(value: unknown): HomeStats | null {
  if (typeof value !== "object" || value === null) return null;
  const stats = value as Record<string, unknown>;
  if (
    typeof stats.minStudents !== "number" ||
    typeof stats.departments !== "object" ||
    stats.departments === null ||
    !Array.isArray(stats.easiest) ||
    !Array.isArray(stats.hardest)
  ) {
    return null;
  }

  return {
    minStudents: stats.minStudents,
    departments: stats.departments as HomeStats["departments"],
    easiest: stats.easiest.filter(isRankedCourse),
    hardest: stats.hardest.filter(isRankedCourse),
  };
}

let homeStatsPromise: Promise<HomeStats | null> | null = null;

/** Resolves to null when the aggregate file is missing, so the page can hide those sections. */
export function loadHomeStats(): Promise<HomeStats | null> {
  homeStatsPromise ??= fetch("/encrypted/home-stats.json")
    .then((response) => (response.ok ? response.json() : null))
    .then(parseHomeStats)
    .catch(() => null);
  return homeStatsPromise;
}
