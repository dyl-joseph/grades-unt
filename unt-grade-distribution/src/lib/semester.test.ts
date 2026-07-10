import assert from "node:assert/strict";
import test from "node:test";
import { compareSemesterLabels, groupBySemester, semesterLabel, semesterWindow } from "./semester";

const section = (year: string | null, term: string | null, id: string) => ({ year, term, id });

test("semesterLabel combines term and year for normal term data", () => {
  assert.equal(semesterLabel({ year: "2025", term: "Fall" }), "Fall 2025");
});

test("semesterLabel preserves explicit synthetic semester labels", () => {
  assert.equal(semesterLabel({ year: "", term: "test_semester" }), "test_semester");
});

test("semesterLabel defaults missing metadata to Fall 2025", () => {
  assert.equal(semesterLabel({ year: null, term: null }), "Fall 2025");
});

test("groupBySemester groups sections and sorts newest semester first", () => {
  const groups = groupBySemester([
    section("2024", "Spring", "old"),
    section("", "test_semester", "test"),
    section("2025", "Fall", "new"),
    section("2025", "Fall", "new-2"),
  ]);

  assert.deepEqual(groups.map((group) => group.label), ["Fall 2025", "Spring 2024", "test_semester"]);
  assert.deepEqual(groups[0].items.map((item) => item.id), ["new", "new-2"]);
});

test("compareSemesterLabels sorts conventional terms by year and academic term", () => {
  const labels = ["Spring 2025", "Fall 2024", "Summer 2025", "Fall 2025"].sort(compareSemesterLabels);
  assert.deepEqual(labels, ["Fall 2025", "Summer 2025", "Spring 2025", "Fall 2024"]);
});

test("semesterWindow defaults to the two newest semesters", () => {
  const labels = ["Fall 2025", "Fall 2019", "Spring 2019"];
  assert.deepEqual(semesterWindow(labels, "", 2), ["Fall 2025", "Fall 2019"]);
});

test("semesterWindow keeps two semesters visible at the end of the list", () => {
  const labels = ["Fall 2025", "Fall 2019", "Spring 2019"];
  assert.deepEqual(semesterWindow(labels, "Spring 2019", 2), ["Fall 2019", "Spring 2019"]);
  assert.deepEqual(semesterWindow(labels, "Spring 2019", 1), ["Spring 2019"]);
});
