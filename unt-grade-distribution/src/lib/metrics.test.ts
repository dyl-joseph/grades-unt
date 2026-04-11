import assert from "node:assert/strict";
import test from "node:test";
import {
  formatServerTiming,
  initializeMetrics,
  recordSearchCacheHit,
  recordSearchCacheMiss,
  recordSearchSkip,
  recordSearchQuery,
  recordSearchError,
  recordRequestError,
} from "./metrics";

// formatServerTiming

test("formatServerTiming formats a single entry with name only", () => {
  const result = formatServerTiming([{ name: "db" }]);
  assert.equal(result, "db");
});

test("formatServerTiming formats an entry with duration", () => {
  const result = formatServerTiming([{ name: "db", durationMs: 12.5 }]);
  assert.equal(result, "db;dur=12.5");
});

test("formatServerTiming formats an entry with description", () => {
  const result = formatServerTiming([{ name: "db", description: "query" }]);
  assert.equal(result, 'db;desc="query"');
});

test("formatServerTiming formats an entry with all fields", () => {
  const result = formatServerTiming([{ name: "db", durationMs: 5.0, description: "select" }]);
  assert.equal(result, 'db;desc="select";dur=5.0');
});

test("formatServerTiming joins multiple entries with comma", () => {
  const result = formatServerTiming([
    { name: "db", durationMs: 5.0 },
    { name: "cache", durationMs: 1.0 },
  ]);
  assert.equal(result, "db;dur=5.0, cache;dur=1.0");
});

test("formatServerTiming skips entries with empty name", () => {
  const result = formatServerTiming([
    { name: "", durationMs: 5.0 },
    { name: "cache", durationMs: 1.0 },
  ]);
  assert.equal(result, "cache;dur=1.0");
});

test("formatServerTiming escapes backslashes and quotes in description", () => {
  const result = formatServerTiming([{ name: "x", description: 'say \\"hi\\"' }]);
  assert.equal(result, 'x;desc="say \\\\\\"hi\\\\\\""');
});

test("formatServerTiming returns empty string for empty array", () => {
  const result = formatServerTiming([]);
  assert.equal(result, "");
});

test("formatServerTiming omits non-finite durations", () => {
  const result = formatServerTiming([{ name: "x", durationMs: NaN }]);
  assert.equal(result, "x");
});

// metric recording functions — verify counters increment correctly

test("recordSearchCacheHit increments cacheHits and queries", () => {
  // Reset global metrics state before each counting test
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  recordSearchCacheHit("math", 10, { courses: 2, instructors: 1 });

  const snap = initializeMetrics();
  assert.equal(snap.search.cacheHits, 1);
  assert.equal(snap.search.queries, 1);
  assert.equal(snap.search.lastDurationMs, 10);
});

test("recordSearchCacheMiss increments cacheMisses only", () => {
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  recordSearchCacheMiss();

  const snap = initializeMetrics();
  assert.equal(snap.search.cacheMisses, 1);
  assert.equal(snap.search.queries, 0);
});

test("recordSearchSkip increments cacheSkips", () => {
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  recordSearchSkip("cs", 5);

  const snap = initializeMetrics();
  assert.equal(snap.search.cacheSkips, 1);
});

test("recordSearchQuery increments queries and cacheMisses event", () => {
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  recordSearchQuery("bio", 20, { courses: 3, instructors: 0 });

  const snap = initializeMetrics();
  assert.equal(snap.search.queries, 1);
  assert.equal(snap.search.lastDurationMs, 20);
});

test("recordSearchError increments errors", () => {
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  recordSearchError("chem", 8, new Error("timeout"));

  const snap = initializeMetrics();
  assert.equal(snap.search.errors, 1);
});

test("recordRequestError increments requestErrors", () => {
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  recordRequestError("/api/search", "GET", "/api/search", "route", new Error("db down"));

  const snap = initializeMetrics();
  assert.equal(snap.requestErrors, 1);
});

test("recentEvents does not exceed 50 entries", () => {
  globalThis.__untGradeMetrics = undefined;
  initializeMetrics();

  for (let i = 0; i < 60; i++) {
    recordSearchCacheHit(`query${i}`, i, { courses: 0, instructors: 0 });
  }

  const snap = initializeMetrics();
  assert.ok(snap.recentEvents.length <= 50);
});
