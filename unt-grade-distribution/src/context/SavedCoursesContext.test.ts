import assert from "node:assert/strict";
import test from "node:test";
import { parseStoredItems } from "./SavedCoursesContext";

const valid = {
  courseId: 1, prefix: "ACCT", number: "2010", title: "Principles", gpa: 3.1,
  gradeA: 1, gradeB: 2, gradeC: 0, gradeD: 0, gradeF: 0, gradeP: 0, gradeNP: 0, gradeW: 0, gradeI: 0,
  totalEnroll: 3, sectionCount: 1,
};

test("parseStoredItems keeps well-formed saved courses", () => {
  assert.deepEqual(parseStoredItems(JSON.stringify([valid, { ...valid, courseId: 2, gpa: null }])), [
    valid,
    { ...valid, courseId: 2, gpa: null },
  ]);
});

test("parseStoredItems drops malformed entries and tolerates corrupt storage", () => {
  assert.deepEqual(parseStoredItems(null), []);
  assert.deepEqual(parseStoredItems("not json"), []);
  assert.deepEqual(parseStoredItems(JSON.stringify({ items: [valid] })), []);
  assert.deepEqual(
    parseStoredItems(JSON.stringify([valid, null, { ...valid, gpa: "3.1" }, { ...valid, gradeA: undefined }])),
    [valid]
  );
});
