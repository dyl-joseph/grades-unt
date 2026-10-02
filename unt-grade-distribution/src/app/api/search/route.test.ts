import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { buildSearchHeaders, getCourseSearchWhere, getInstructorSearchWhere, getSearchPlan, normalizeSearchQuery } from "@/lib/search";

// lib/prisma reuses globalThis.prisma outside production; inject a client whose
// queries fail so these tests never depend on whether a real database is reachable.
const failingQuery = async () => { throw new Error("connect ECONNREFUSED 10.0.0.5:5432"); };
Object.assign(globalThis, {
  prisma: { course: { findMany: failingQuery }, instructor: { findMany: failingQuery } },
});

test("normalizeSearchQuery collapses whitespace and lowercases", () => {
  assert.equal(normalizeSearchQuery("  ACCT   2010  "), "acct 2010");
});

test("getSearchPlan identifies course-style queries and preserves title search", () => {
  const plan = getSearchPlan("ACCT 2010");

  assert.equal(plan.cacheKey, "acct 2010");
  assert.equal(plan.courseTake, 10);
  assert.equal(plan.instructorTake, 0);
  assert.equal(plan.prefix, "ACCT");
  assert.equal(plan.number, "2010");
  assert.equal(plan.queryKind, "course");
});

test("getSearchPlan uses normalized whitespace for course detection", () => {
  const canonical = getSearchPlan("ACCT 2010");
  const spaced = getSearchPlan("  acct   2010  ");
  const compact = getSearchPlan("acct2010");

  assert.deepEqual(
    { prefix: spaced.prefix, number: spaced.number, queryKind: spaced.queryKind, courseTake: spaced.courseTake, instructorTake: spaced.instructorTake },
    { prefix: canonical.prefix, number: canonical.number, queryKind: canonical.queryKind, courseTake: canonical.courseTake, instructorTake: canonical.instructorTake }
  );
  assert.deepEqual(
    { prefix: compact.prefix, number: compact.number, queryKind: compact.queryKind, courseTake: compact.courseTake, instructorTake: compact.instructorTake },
    { prefix: canonical.prefix, number: canonical.number, queryKind: canonical.queryKind, courseTake: canonical.courseTake, instructorTake: canonical.instructorTake }
  );
});

test("search where helpers keep course-code lookups on the indexed path", () => {
  const plan = getSearchPlan("cs 1010");

  assert.deepEqual(getCourseSearchWhere(plan, "cs 1010"), {
    prefix: { startsWith: "CS" },
    number: { startsWith: "1010" },
  });
  assert.deepEqual(getInstructorSearchWhere("smith"), {
    OR: [
      { lastName: { contains: "smith", mode: "insensitive" } },
      { firstName: { contains: "smith", mode: "insensitive" } },
    ],
  });
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

test("search route leaves quota charging to proxy (no duplicate charge)", async () => {
  process.env.DATABASE_URL ??= "postgresql://ci:ci@localhost:5432/ci";
  process.env.DIRECT_URL ??= process.env.DATABASE_URL;
  const { GET } = await import("./route");
  const response = await GET(new NextRequest("https://example.test/api/search?q=a"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.has("x-ratelimit-remaining"), false);
});

test("search route failures are not CDN-cacheable and do not leak database errors", async (t) => {
  t.mock.method(console, "error", () => undefined);
  const { GET } = await import("./route");

  const response = await GET(new NextRequest("https://example.test/api/search?q=zz-failure-probe"));
  assert.equal(response.status, 500);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await response.json(), { error: "Database query failed" });
});
