import assert from "node:assert/strict";
import test from "node:test";
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
  const row = buildSearchLogRow({
    rawQuery: "Ada Lovelace",
    normalizedQuery: "ada lovelace",
    searchKind: "instructor",
    source: "site",
    coursePrefix: "CS",
    courseNumber: "1010",
    courseTitle: "Computer Science I",
    instructorFirstName: "Ada",
    instructorLastName: "Lovelace",
  });

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
