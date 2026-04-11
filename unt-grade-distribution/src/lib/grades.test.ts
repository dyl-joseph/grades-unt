import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateGrades,
  calculateGPA,
  gpaColor,
  toChartData,
} from "./grades";

const emptyGrades = {
  gradeA: 0,
  gradeB: 0,
  gradeC: 0,
  gradeD: 0,
  gradeF: 0,
  gradeP: 0,
  gradeNP: 0,
  gradeW: 0,
  gradeI: 0,
  totalEnroll: 0,
};

// calculateGPA

test("calculateGPA returns null when no letter grades exist", () => {
  const data = { ...emptyGrades, gradeP: 10, totalEnroll: 10 };
  assert.equal(calculateGPA(data), null);
});

test("calculateGPA returns 4.0 when all students got an A", () => {
  const data = { ...emptyGrades, gradeA: 20, totalEnroll: 20 };
  assert.equal(calculateGPA(data), 4.0);
});

test("calculateGPA returns 0.0 when all students got an F", () => {
  const data = { ...emptyGrades, gradeF: 10, totalEnroll: 10 };
  assert.equal(calculateGPA(data), 0.0);
});

test("calculateGPA computes weighted average correctly", () => {
  // 10 A's (4.0) + 10 B's (3.0) → (40 + 30) / 20 = 3.50
  const data = { ...emptyGrades, gradeA: 10, gradeB: 10, totalEnroll: 20 };
  assert.equal(calculateGPA(data), 3.5);
});

// toChartData

test("toChartData returns one entry per grade in GRADE_ORDER", () => {
  const data = { ...emptyGrades, gradeA: 5, gradeB: 5, totalEnroll: 10 };
  const result = toChartData(data);
  assert.equal(result.length, 9);
  assert.deepEqual(
    result.map((r) => r.grade),
    ["A", "B", "C", "D", "F", "P", "NP", "W", "I"]
  );
});

test("toChartData calculates percentage relative to totalEnroll", () => {
  const data = { ...emptyGrades, gradeA: 1, totalEnroll: 4 };
  const aEntry = toChartData(data).find((r) => r.grade === "A")!;
  assert.equal(aEntry.count, 1);
  assert.equal(aEntry.percentage, 25);
});

// aggregateGrades

test("aggregateGrades sums two sections correctly", () => {
  const s1 = { ...emptyGrades, gradeA: 10, gradeB: 5, totalEnroll: 15 };
  const s2 = { ...emptyGrades, gradeA: 5, gradeC: 10, totalEnroll: 15 };
  const result = aggregateGrades([s1, s2]);
  assert.equal(result.gradeA, 15);
  assert.equal(result.gradeB, 5);
  assert.equal(result.gradeC, 10);
  assert.equal(result.totalEnroll, 30);
});

test("aggregateGrades returns empty grades for an empty array", () => {
  const result = aggregateGrades([]);
  assert.deepEqual(result, emptyGrades);
});

// gpaColor

test("gpaColor returns green for GPA >= 3.5", () => {
  assert.equal(gpaColor(4.0), "bg-green-500 text-white");
  assert.equal(gpaColor(3.5), "bg-green-500 text-white");
});

test("gpaColor returns yellow for GPA between 2.5 and 3.5", () => {
  assert.equal(gpaColor(3.0), "bg-yellow-400 text-black");
  assert.equal(gpaColor(2.5), "bg-yellow-400 text-black");
});

test("gpaColor returns orange for GPA between 2.0 and 2.5", () => {
  assert.equal(gpaColor(2.0), "bg-orange-500 text-white");
});

test("gpaColor returns red for GPA below 2.0", () => {
  assert.equal(gpaColor(1.5), "bg-red-600 text-white");
});

test("gpaColor returns gray for null GPA", () => {
  assert.equal(gpaColor(null), "bg-gray-400 text-white");
});
