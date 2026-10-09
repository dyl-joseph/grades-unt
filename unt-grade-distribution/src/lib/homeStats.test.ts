import assert from "node:assert/strict";
import test from "node:test";
import { isDist, loadHomeStats, parseHomeStats } from "./homeStats";

test("parseHomeStats rejects malformed files and drops malformed rows", () => {
  assert.equal(parseHomeStats(null), null);
  assert.equal(parseHomeStats({ minStudents: 200 }), null);

  const good = { prefix: "ACCT", number: "2010", title: "T", gpa: 3, dfwRate: 10, students: 300 };
  const parsed = parseHomeStats({
    minStudents: 200,
    departments: { ACCT: { avgGpa: 3, students: 300 } },
    easiest: [good, { prefix: "BAD" }],
    hardest: [],
  });

  assert.deepEqual(parsed?.easiest, [good]);
  assert.deepEqual(parsed?.hardest, []);
});

test("parseHomeStats keeps rows with a valid grade mix and drops a malformed one", () => {
  const row = { prefix: "ACCT", number: "2010", title: "T", gpa: 3, dfwRate: 10, students: 300 };
  const withDist = { ...row, dist: [50, 25, 10, 5, 5, 5] };
  const parsed = parseHomeStats({
    minStudents: 200,
    departments: {},
    easiest: [withDist, { ...row, dist: [1, 2] }],
    hardest: [],
  });

  assert.deepEqual(parsed?.easiest, [withDist]);
  assert.equal(isDist([1, 2, 3, 4, 5, 6]), true);
  assert.equal(isDist([1, 2, 3]), false);
});

test("loadHomeStats retries after a transient failure and shares concurrent requests", async () => {
  const originalFetch = globalThis.fetch;
  const stats = { minStudents: 200, easiest: [], hardest: [] };
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response(null, { status: 429 })
      : Response.json(stats);
  };
  try {
    assert.equal(await loadHomeStats(), null);
    const first = loadHomeStats();
    const second = loadHomeStats();
    assert.equal(first, second);
    assert.deepEqual(await first, stats);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
