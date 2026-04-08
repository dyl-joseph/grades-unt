import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchHeaders, getSearchPlan, normalizeSearchQuery } from "@/lib/search";

test("normalizeSearchQuery collapses whitespace and lowercases", () => {
  assert.equal(normalizeSearchQuery("  ACCT   2010  "), "acct 2010");
});

test("getSearchPlan identifies course-style queries and preserves title search", () => {
  const plan = getSearchPlan("ACCT 2010");

  assert.equal(plan.cacheKey, "acct 2010");
  assert.equal(plan.courseTake, 10);
  assert.equal(plan.instructorTake, 5);
  assert.equal(plan.prefix, "ACCT");
  assert.equal(plan.number, "2010");
  assert.equal(plan.queryKind, "course");
});

test("buildSearchHeaders emits cache and timing metadata", () => {
  const headers = buildSearchHeaders({
    totalDurationMs: 12.345,
    dbDurationMs: 7.89,
    cacheState: "miss",
    queryKind: "name",
    resultCounts: { courses: 4, instructors: 6 },
  });

  assert.equal(headers["Cache-Control"], "public, max-age=0, s-maxage=300, stale-while-revalidate=1800");
  assert.equal(headers["x-search-cache"], "miss");
  assert.equal(headers["x-search-kind"], "name");
  assert.equal(headers["x-search-courses"], "4");
  assert.equal(headers["x-search-instructors"], "6");
  assert.match(headers["Server-Timing"], /search;desc="miss";dur=12\.3/);
  assert.match(headers["Server-Timing"], /db;dur=7\.9/);
});
