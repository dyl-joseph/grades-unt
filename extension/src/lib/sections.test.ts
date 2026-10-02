import assert from "node:assert/strict";
import test from "node:test";
import { groupSectionsByCourse, instructorPagePath } from "./sections";
import type { Section } from "./types";

function section(sectionNumber: string, prefix: string, number: string): Section {
  return {
    id: Number(sectionNumber), sectionNumber,
    gradeA: 1, gradeB: 0, gradeC: 0, gradeD: 0, gradeF: 0, gradeP: 0, gradeNP: 0, gradeW: 0, gradeI: 0,
    totalEnroll: 1,
    course: { prefix, number, title: `${prefix} ${number}` },
  };
}

test("groups instructor sections by course code (the API returns no courseId)", () => {
  const groups = groupSectionsByCourse([
    section("1", "ACCT", "2010"),
    section("2", "CSCE", "1030"),
    section("3", "ACCT", "2010"),
  ]);
  assert.deepEqual(groups.map(({ key, secs }) => [key, secs.map((s) => s.sectionNumber)]), [
    ["ACCT:2010", ["1", "3"]],
    ["CSCE:1030", ["2"]],
  ]);
});

test("links instructors to the website's Last,First slug instead of the numeric API id", () => {
  assert.equal(instructorPagePath({ firstName: "Ada", lastName: "Lovelace" }), "/instructor/Lovelace%2CAda");
});
