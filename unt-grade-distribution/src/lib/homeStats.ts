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
  easiest: RankedCourse[];
  hardest: RankedCourse[];
};

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
    !Array.isArray(stats.easiest) ||
    !Array.isArray(stats.hardest)
  ) {
    return null;
  }

  return {
    minStudents: stats.minStudents,
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
    .catch(() => null)
    .then((stats) => {
      // A rate-limit or network error must not hide rankings for the whole session.
      if (!stats) homeStatsPromise = null;
      return stats;
    });
  return homeStatsPromise;
}
