import assert from "node:assert/strict";
import test from "node:test";
import {
  formatServerTiming,
  initializeMetrics,
  recordRequestError,
  recordSearchCacheHit,
  recordSearchCacheMiss,
  recordSearchError,
  recordSearchQuery,
  recordSearchSkip,
  type MetricsSnapshot,
} from "./metrics";

function snapshot(): MetricsSnapshot {
  return initializeMetrics();
}

function reset(): MetricsSnapshot {
  const s = snapshot();
  s.requestErrors = 0;
  s.search.cacheHits = 0;
  s.search.cacheMisses = 0;
  s.search.cacheSkips = 0;
  s.search.queries = 0;
  s.search.errors = 0;
  s.search.lastDurationMs = null;
  s.search.slowestDurationMs = null;
  s.recentEvents.length = 0;
  return s;
}

function lastEvent(s: MetricsSnapshot) {
  return s.recentEvents[s.recentEvents.length - 1] as Record<string, unknown>;
}

// initializeMetrics

test("initializeMetrics returns the same snapshot instance across calls", () => {
  reset();
  assert.equal(initializeMetrics(), initializeMetrics());
});

// recordSearchCacheHit

test("recordSearchCacheHit bumps cacheHits and queries, updates durations, pushes event", () => {
  const s = reset();
  const before = Date.now();
  recordSearchCacheHit("csce 1010", 12.3, { courses: 2, instructors: 0 }, "course");
  const after = Date.now();

  assert.equal(s.search.cacheHits, 1);
  assert.equal(s.search.queries, 1);
  assert.equal(s.search.lastDurationMs, 12.3);
  assert.equal(s.search.slowestDurationMs, 12.3);
  assert.equal(s.recentEvents.length, 1);

  const event = lastEvent(s);
  assert.deepEqual(Object.keys(event).sort(), [
    "courseCount",
    "durationMs",
    "instructorCount",
    "kind",
    "outcome",
    "query",
    "queryKind",
    "timestamp",
  ]);
  assert.equal(event.kind, "search");
  assert.equal(event.outcome, "cache-hit");
  assert.equal(event.query, "csce 1010");
  assert.equal(event.queryKind, "course");
  assert.equal(event.durationMs, 12.3);
  assert.equal(event.courseCount, 2);
  assert.equal(event.instructorCount, 0);
  assert.ok(typeof event.timestamp === "number");
  assert.ok((event.timestamp as number) >= before && (event.timestamp as number) <= after);
});

test("recordSearchCacheHit always includes count keys and never a message key", () => {
  const s = reset();
  recordSearchCacheHit("x", 1, { courses: 0, instructors: 0 });
  const event = lastEvent(s);
  assert.ok("courseCount" in event);
  assert.ok("instructorCount" in event);
  assert.ok(!("message" in event));
});

// recordSearchCacheMiss

test("recordSearchCacheMiss only bumps cacheMisses: no queries, no durations, no event", () => {
  const s = reset();
  recordSearchCacheMiss();

  assert.equal(s.search.cacheMisses, 1);
  assert.equal(s.search.queries, 0);
  assert.equal(s.search.lastDurationMs, null);
  assert.equal(s.search.slowestDurationMs, null);
  assert.equal(s.recentEvents.length, 0);
});

// recordSearchSkip

test("recordSearchSkip bumps cacheSkips, updates durations, pushes skip event", () => {
  const s = reset();
  recordSearchSkip("a", 0.4);

  assert.equal(s.search.cacheSkips, 1);
  assert.equal(s.search.queries, 0);
  assert.equal(s.search.lastDurationMs, 0.4);
  assert.equal(s.search.slowestDurationMs, 0.4);
  assert.equal(s.recentEvents.length, 1);

  const event = lastEvent(s);
  assert.deepEqual(Object.keys(event).sort(), [
    "durationMs",
    "kind",
    "outcome",
    "query",
    "queryKind",
    "timestamp",
  ]);
  assert.equal(event.kind, "search");
  assert.equal(event.outcome, "cache-skip");
  assert.equal(event.query, "a");
  assert.equal(event.queryKind, "skip");
  assert.equal(event.durationMs, 0.4);
});

// recordSearchQuery

test("recordSearchQuery bumps queries only, updates durations, pushes cache-miss event", () => {
  const s = reset();
  recordSearchQuery("smith", 42, { courses: 0, instructors: 3 }, "name");

  assert.equal(s.search.queries, 1);
  assert.equal(s.search.cacheHits, 0);
  assert.equal(s.search.cacheMisses, 0);
  assert.equal(s.search.lastDurationMs, 42);
  assert.equal(s.search.slowestDurationMs, 42);
  assert.equal(s.recentEvents.length, 1);

  const event = lastEvent(s);
  assert.deepEqual(Object.keys(event).sort(), [
    "courseCount",
    "durationMs",
    "instructorCount",
    "kind",
    "outcome",
    "query",
    "queryKind",
    "timestamp",
  ]);
  assert.equal(event.outcome, "cache-miss");
  assert.equal(event.query, "smith");
  assert.equal(event.queryKind, "name");
  assert.equal(event.courseCount, 0);
  assert.equal(event.instructorCount, 3);
});

// recordSearchError

test("recordSearchError bumps errors, updates durations, pushes error event with message", () => {
  const s = reset();
  recordSearchError("csce", 7.5, new Error("boom"), "course");

  assert.equal(s.search.errors, 1);
  assert.equal(s.search.queries, 0);
  assert.equal(s.search.lastDurationMs, 7.5);
  assert.equal(s.recentEvents.length, 1);

  const event = lastEvent(s);
  assert.deepEqual(Object.keys(event).sort(), [
    "durationMs",
    "kind",
    "message",
    "outcome",
    "query",
    "queryKind",
    "timestamp",
  ]);
  assert.equal(event.outcome, "error");
  assert.equal(event.message, "boom");
});

test("recordSearchError stringifies non-Error values", () => {
  const s = reset();
  recordSearchError("csce", 1, "plain failure");
  assert.equal(lastEvent(s).message, "plain failure");
});

// duration tracking

test("slowestDurationMs tracks the maximum, lastDurationMs tracks the latest", () => {
  const s = reset();
  recordSearchSkip("a", 10);
  recordSearchSkip("b", 30);
  recordSearchSkip("c", 20);

  assert.equal(s.search.lastDurationMs, 20);
  assert.equal(s.search.slowestDurationMs, 30);
});

// recordRequestError

test("recordRequestError bumps requestErrors and pushes a request-error event", () => {
  const s = reset();
  recordRequestError("/api/search", "GET", "/api/search", "route", new Error("db down"));

  assert.equal(s.requestErrors, 1);
  assert.equal(s.search.errors, 0);
  assert.equal(s.recentEvents.length, 1);

  const event = lastEvent(s);
  assert.deepEqual(Object.keys(event).sort(), [
    "kind",
    "message",
    "method",
    "path",
    "routePath",
    "routeType",
    "timestamp",
  ]);
  assert.equal(event.kind, "request-error");
  assert.equal(event.path, "/api/search");
  assert.equal(event.method, "GET");
  assert.equal(event.routePath, "/api/search");
  assert.equal(event.routeType, "route");
  assert.equal(event.message, "db down");
});

// ring buffer

test("recentEvents is capped at 50 entries, dropping the oldest", () => {
  const s = reset();
  for (let i = 0; i < 55; i++) {
    recordSearchSkip(`q${i}`, i);
  }

  assert.equal(s.recentEvents.length, 50);
  assert.equal((s.recentEvents[0] as { query: string }).query, "q5");
  assert.equal((s.recentEvents[49] as { query: string }).query, "q54");
});

// formatServerTiming

test("formatServerTiming renders name, description, and duration", () => {
  const header = formatServerTiming([
    { name: "search", description: "miss", durationMs: 12.34 },
    { name: "db", durationMs: 4 },
  ]);
  assert.equal(header, 'search;desc="miss";dur=12.3, db;dur=4.0');
});

test("formatServerTiming drops entries with empty names", () => {
  assert.equal(formatServerTiming([{ name: "", durationMs: 1 }]), "");
});

test("formatServerTiming omits dur when durationMs is not finite", () => {
  assert.equal(
    formatServerTiming([{ name: "a", durationMs: Number.NaN }, { name: "b" }]),
    "a, b"
  );
});

test("formatServerTiming escapes quotes and backslashes in descriptions", () => {
  assert.equal(
    formatServerTiming([{ name: "a", description: 'say "hi" \\ path' }]),
    'a;desc="say \\"hi\\" \\\\ path"'
  );
});

