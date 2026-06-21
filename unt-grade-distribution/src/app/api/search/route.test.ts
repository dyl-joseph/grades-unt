import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { buildSearchHeaders, getCourseSearchWhere, getInstructorSearchWhere, getSearchPlan, normalizeSearchQuery } from "@/lib/search";

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

test("search route consumes one install rate-limit slot per short query", async () => {
  process.env.DATABASE_URL ??= "postgresql://ci:ci@localhost:5432/ci";
  process.env.DIRECT_URL ??= process.env.DATABASE_URL;

  const { GET } = await import("./route");
  const installId = `route-test-${Date.now()}-${Math.random()}`;
  const request = () =>
    new NextRequest("https://example.test/api/search?q=a", {
      headers: { "x-install-id": installId },
    });

  for (let i = 0; i < 100; i++) {
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-ratelimit-remaining"), String(99 - i));
  }

  const limited = await GET(request());
  assert.equal(limited.status, 429);
});
