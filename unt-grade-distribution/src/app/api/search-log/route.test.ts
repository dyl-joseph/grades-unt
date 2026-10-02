import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { buildSearchLogRow } from "@/lib/search-log";

test("course search logs retain course details", () => {
  const row = buildSearchLogRow({
    rawQuery: "ACCT 2010",
    normalizedQuery: "acct 2010",
    searchKind: "course",
    source: "site",
    coursePrefix: "ACCT",
    courseNumber: "2010",
    courseTitle: "Principles of Accounting",
  });

  assert.equal(row?.raw_query, "ACCT 2010");
  assert.equal(row?.course_prefix, "ACCT");
});

test("instructor search logs contain no identifying query or instructor data", () => {
  const payload = {
    rawQuery: "Ada Lovelace",
    normalizedQuery: "ada lovelace",
    searchKind: "instructor",
    source: "site",
    coursePrefix: "CS",
    courseNumber: "1010",
    courseTitle: "Computer Science I",
    instructorFirstName: "Ada",
    instructorLastName: "Lovelace",
  };
  const row = buildSearchLogRow(payload);

  assert.deepEqual(row, {
    raw_query: null,
    normalized_query: null,
    search_kind: "instructor",
    source: "site",
    course_prefix: null,
    course_number: null,
    course_title: null,
    result_count_courses: 0,
    result_count_instructors: 0,
  });
});


test("search logging rejects oversized and non-object bodies before external writes", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected external write"); });
  for (const body of ["null", "[]", "42", JSON.stringify({ rawQuery: "x".repeat(4096) })]) {
    const response = await POST(new NextRequest("https://example.test/api/search-log", { method: "POST", body }));
    assert.ok([400, 413].includes(response.status));
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("search logging is a no-op when Supabase is not configured", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected external write"); });
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  t.after(() => {
    if (saved.url !== undefined) process.env.SUPABASE_URL = saved.url;
    if (saved.key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
  });

  const response = await POST(new NextRequest("https://example.test/api/search-log", {
    method: "POST",
    body: JSON.stringify({ rawQuery: "ACCT 2010", searchKind: "course" }),
  }));
  assert.equal(response.status, 204);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("search logging reports upstream network failures instead of throwing", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  t.mock.method(console, "error", () => undefined);
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = "https://supabase.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  t.after(() => {
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
  });

  const response = await POST(new NextRequest("https://example.test/api/search-log", {
    method: "POST",
    body: JSON.stringify({ rawQuery: "ACCT 2010", searchKind: "course" }),
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to record search" });
});
