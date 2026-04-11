import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateGPA,
  toChartData,
  aggregateGrades,
  gpaColor,
} from "./grades";

const sampleData = {
  gradeA: 10,
  gradeB: 8,
  gradeC: 5,
  gradeD: 2,
  gradeF: 1,
  gradeP: 3,
  gradeNP: 1,
  gradeW: 2,
  gradeI: 0,
  totalEnroll: 32,
};

// calculateGPA

test("calculateGPA returns correct weighted GPA", () => {
  // (10*4 + 8*3 + 5*2 + 2*1 + 1*0) / (10+8+5+2+1) = (40+24+10+2+0)/26 = 76/26 ≈ 2.92
  const result = calculateGPA(sampleData);
  assert.equal(result, 2.92);
});

test("calculateGPA returns null when no letter grades exist", () => {
  const allPNP = {
    ...sampleData,
    gradeA: 0,
    gradeB: 0,
    gradeC: 0,
    gradeD: 0,
    gradeF: 0,
  };
  assert.equal(calculateGPA(allPNP), null);
});

test("calculateGPA returns 4.0 for all-A section", () => {
  const allA = {
    ...sampleData,
    gradeA: 20,
    gradeB: 0,
    gradeC: 0,
    gradeD: 0,
    gradeF: 0,
  };
  assert.equal(calculateGPA(allA), 4.0);
});

test("calculateGPA returns 0 for all-F section", () => {
  const allF = {
    ...sampleData,
    gradeA: 0,
    gradeB: 0,
    gradeC: 0,
    gradeD: 0,
    gradeF: 10,
  };
  assert.equal(calculateGPA(allF), 0.0);
});

// toChartData

test("toChartData returns 9 entries in GRADE_ORDER", () => {
  const chart = toChartData(sampleData);
  assert.equal(chart.length, 9);
  assert.equal(chart[0].grade, "A");
  assert.equal(chart[chart.length - 1].grade, "I");
});

test("toChartData computes percentage based on totalEnroll", () => {
  const chart = toChartData(sampleData);
  const aEntry = chart.find((d) => d.grade === "A");
  assert.ok(aEntry);
  // 10 / 32 * 100 = 31.25 → rounded to 1 decimal = 31.3
  assert.equal(aEntry.count, 10);
  assert.equal(aEntry.percentage, 31.3);
});

test("toChartData uses 1 as denominator when totalEnroll is 0", () => {
  const zeroEnroll = { ...sampleData, totalEnroll: 0 };
  const chart = toChartData(zeroEnroll);
  const aEntry = chart.find((d) => d.grade === "A");
  assert.ok(aEntry);
  assert.equal(aEntry.percentage, 10 * 1000 / 10); // gradeA/1 * 1000 / 10
});

// aggregateGrades

test("aggregateGrades sums two sections correctly", () => {
  const result = aggregateGrades([sampleData, sampleData]);
  assert.equal(result.gradeA, 20);
  assert.equal(result.gradeB, 16);
  assert.equal(result.totalEnroll, 64);
});

test("aggregateGrades returns zero data for empty array", () => {
  const result = aggregateGrades([]);
  assert.equal(result.gradeA, 0);
  assert.equal(result.totalEnroll, 0);
});

test("aggregateGrades handles single section", () => {
  const result = aggregateGrades([sampleData]);
  assert.equal(result.gradeA, sampleData.gradeA);
  assert.equal(result.totalEnroll, sampleData.totalEnroll);
});

// gpaColor

test("gpaColor returns green for GPA >= 3.5", () => {
  assert.equal(gpaColor(3.5), "bg-green-500 text-white");
  assert.equal(gpaColor(4.0), "bg-green-500 text-white");
});

test("gpaColor returns yellow for GPA >= 2.5 and < 3.5", () => {
  assert.equal(gpaColor(3.0), "bg-yellow-400 text-black");
  assert.equal(gpaColor(2.5), "bg-yellow-400 text-black");
});

test("gpaColor returns orange for GPA >= 2.0 and < 2.5", () => {
  assert.equal(gpaColor(2.0), "bg-orange-500 text-white");
  assert.equal(gpaColor(2.4), "bg-orange-500 text-white");
});

test("gpaColor returns red for GPA < 2.0", () => {
  assert.equal(gpaColor(1.9), "bg-red-600 text-white");
  assert.equal(gpaColor(0.0), "bg-red-600 text-white");
});

test("gpaColor returns gray for null GPA", () => {
  assert.equal(gpaColor(null), "bg-gray-400 text-white");
});
