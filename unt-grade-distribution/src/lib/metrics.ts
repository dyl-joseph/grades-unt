type SearchMetricOutcome = "cache-hit" | "cache-miss" | "cache-skip" | "error";

type SearchMetricEvent = {
  kind: "search";
  outcome: SearchMetricOutcome;
  query: string;
  queryKind?: "course" | "name" | "skip";
  durationMs: number;
  courseCount?: number;
  instructorCount?: number;
  message?: string;
  timestamp: number;
};

type RequestErrorEvent = {
  kind: "request-error";
  path: string;
  method: string;
  routePath: string;
  routeType: string;
  message: string;
  timestamp: number;
};

export type MetricsSnapshot = {
  startedAt: number;
  requestErrors: number;
  search: {
    cacheHits: number;
    cacheMisses: number;
    cacheSkips: number;
    queries: number;
    errors: number;
    lastDurationMs: number | null;
    slowestDurationMs: number | null;
  };
  recentEvents: Array<SearchMetricEvent | RequestErrorEvent>;
};

const MAX_RECENT_EVENTS = 50;

declare global {
  var __untGradeMetrics: MetricsSnapshot | undefined;
}

function createMetricsSnapshot(): MetricsSnapshot {
  return {
    startedAt: Date.now(),
    requestErrors: 0,
    search: {
      cacheHits: 0,
      cacheMisses: 0,
      cacheSkips: 0,
      queries: 0,
      errors: 0,
      lastDurationMs: null,
      slowestDurationMs: null,
    },
    recentEvents: [],
  };
}

function getMetricsSnapshot() {
  if (!globalThis.__untGradeMetrics) {
    globalThis.__untGradeMetrics = createMetricsSnapshot();
  }

  return globalThis.__untGradeMetrics;
}

function pushEvent(event: SearchMetricEvent | RequestErrorEvent) {
  const snapshot = getMetricsSnapshot();
  snapshot.recentEvents.push(event);

  if (snapshot.recentEvents.length > MAX_RECENT_EVENTS) {
    snapshot.recentEvents.splice(0, snapshot.recentEvents.length - MAX_RECENT_EVENTS);
  }
}

function updateDuration(durationMs: number) {
  const snapshot = getMetricsSnapshot();
  snapshot.search.lastDurationMs = durationMs;
  snapshot.search.slowestDurationMs =
    snapshot.search.slowestDurationMs === null
      ? durationMs
      : Math.max(snapshot.search.slowestDurationMs, durationMs);
}

export function initializeMetrics() {
  return getMetricsSnapshot();
}

export function recordSearchCacheHit(
  query: string,
  durationMs: number,
  counts: { courses: number; instructors: number },
  queryKind?: "course" | "name"
) {
  const snapshot = getMetricsSnapshot();
  snapshot.search.cacheHits += 1;
  snapshot.search.queries += 1;
  updateDuration(durationMs);
  pushEvent({
    kind: "search",
    outcome: "cache-hit",
    query,
    queryKind,
    durationMs,
    courseCount: counts.courses,
    instructorCount: counts.instructors,
    timestamp: Date.now(),
  });
}

export function recordSearchCacheMiss() {
  const snapshot = getMetricsSnapshot();
  snapshot.search.cacheMisses += 1;
}

export function recordSearchSkip(query: string, durationMs: number) {
  const snapshot = getMetricsSnapshot();
  snapshot.search.cacheSkips += 1;
  updateDuration(durationMs);
  pushEvent({
    kind: "search",
    outcome: "cache-skip",
    query,
    queryKind: "skip",
    durationMs,
    timestamp: Date.now(),
  });
}

export function recordSearchQuery(
  query: string,
  durationMs: number,
  counts: { courses: number; instructors: number },
  queryKind?: "course" | "name"
) {
  const snapshot = getMetricsSnapshot();
  snapshot.search.queries += 1;
  updateDuration(durationMs);
  pushEvent({
    kind: "search",
    outcome: "cache-miss",
    query,
    queryKind,
    durationMs,
    courseCount: counts.courses,
    instructorCount: counts.instructors,
    timestamp: Date.now(),
  });
}

export function recordSearchError(query: string, durationMs: number, error: unknown, queryKind?: "course" | "name") {
  const snapshot = getMetricsSnapshot();
  snapshot.search.errors += 1;
  updateDuration(durationMs);
  pushEvent({
    kind: "search",
    outcome: "error",
    query,
    queryKind,
    durationMs,
    message: error instanceof Error ? error.message : String(error),
    timestamp: Date.now(),
  });
}

export function recordRequestError(
  path: string,
  method: string,
  routePath: string,
  routeType: string,
  error: unknown
) {
  const snapshot = getMetricsSnapshot();
  snapshot.requestErrors += 1;
  pushEvent({
    kind: "request-error",
    path,
    method,
    routePath,
    routeType,
    message: error instanceof Error ? error.message : String(error),
    timestamp: Date.now(),
  });
}

function escapeServerTimingValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function formatServerTiming(entries: Array<{ name: string; durationMs?: number; description?: string }>) {
  return entries
    .filter((entry) => entry.name.length > 0)
    .map((entry) => {
      const parts = [entry.name];

      if (entry.description) {
        parts.push(`desc="${escapeServerTimingValue(entry.description)}"`);
      }

      if (typeof entry.durationMs === "number" && Number.isFinite(entry.durationMs)) {
        parts.push(`dur=${entry.durationMs.toFixed(1)}`);
      }

      return parts.join(";");
    })
    .join(", ");
}
