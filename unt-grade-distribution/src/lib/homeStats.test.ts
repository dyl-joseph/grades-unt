import assert from "node:assert/strict";
import test from "node:test";
import type { ManifestEntry } from "./encryptedData";
import { coursesInDepartment, isDist, parseHomeStats, summarizeManifest } from "./homeStats";

const entry = (prefix: string, number: string, instructors: string[] = []): ManifestEntry => ({
  id: `${prefix}${number}.bin`,
  tokens: [`${prefix} ${number}`, `${prefix} TITLE ${number}`, ...instructors],
  preview: { prefix, number, title: `${prefix} TITLE ${number}` },
});

const manifest = [
  entry("ACCT", "2010", ["Lee,Ann", "Ng,Bo"]),
  entry("ACCT", "2020", ["lee,ann"]),
  entry("CSCE", "1030", ["Ng,Bo", "Staff"]),
  entry("ACCT", "2010", ["Lee,Ann"]),
];

test("summarizeManifest counts distinct courses and departments", () => {
  const summary = summarizeManifest(manifest);

  assert.equal(summary.courses, 3);
  assert.deepEqual(summary.departments, [
    { prefix: "ACCT", courses: 2 },
    { prefix: "CSCE", courses: 1 },
  ]);
});

test("coursesInDepartment matches the prefix case-insensitively and sorts numerically", () => {
  const courses = coursesInDepartment(
    [entry("MATH", "10000"), entry("MATH", "2000"), entry("MATH", "1710"), entry("CSCE", "1030")],
    "math"
  );

  assert.deepEqual(courses.map((course) => course.number), ["1710", "2000", "10000"]);
  assert.deepEqual(coursesInDepartment(manifest, "NOPE"), []);
});

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
