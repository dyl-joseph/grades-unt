// === Constants ===

/** Display order for all 9 grade categories */
export const GRADE_ORDER = [
  "A",
  "B",
  "C",
  "D",
  "F",
  "P",
  "NP",
  "W",
  "I",
] as const;

export type GradeCounts = Record<(typeof GRADE_ORDER)[number], number>;

/** Letter grades used in GPA calculation (excludes P, NP, W, I) */
export const LETTER_GRADES = ["A", "B", "C", "D", "F"] as const;

/** GPA point values */
export const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};

/** Color map for chart bars */
export const GRADE_COLORS: Record<string, string> = {
  A: "#00853e",
  B: "#82932b",
  C: "#c39a24",
  D: "#cc762d",
  F: "#b34e45",
  P: "#5c8b7c",
  NP: "#7a8680",
  W: "#9caaa0",
  I: "#bdc5bd",
};

export const DARK_GRADE_COLORS: Record<string, string> = {
  A: "#62bd87",
  B: "#b2c36b",
  C: "#e5c467",
  D: "#e5a062",
  F: "#df8279",
  P: "#88b5aa",
  NP: "#a7aeb6",
  W: "#8597a8",
  I: "#b8b6aa",
};

// === Types ===

export interface GradeData {
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  gradeF: number;
  gradeP: number;
  gradeNP: number;
  gradeW: number;
  gradeI: number;
  totalEnroll: number;
}

export function toGradeData(grades: GradeCounts): GradeData {
  return {
    gradeA: grades.A,
    gradeB: grades.B,
    gradeC: grades.C,
    gradeD: grades.D,
    gradeF: grades.F,
    gradeP: grades.P,
    gradeNP: grades.NP,
    gradeW: grades.W,
    gradeI: grades.I,
    totalEnroll: GRADE_ORDER.reduce((total, grade) => total + grades[grade], 0),
  };
}

export interface ChartDataPoint {
  grade: string;
  count: number;
  percentage: number;
}

// === Functions ===

/**
 * Calculate weighted GPA from letter grades only (A=4, B=3, C=2, D=1, F=0).
 * Excludes P, NP, W, I from the calculation.
 * Returns null if no letter grades were awarded (e.g., all P/NP section).
 */
export function calculateGPA(data: GradeData): number | null {
  const total =
    data.gradeA + data.gradeB + data.gradeC + data.gradeD + data.gradeF;
  if (total === 0) return null;

  const points =
    4.0 * data.gradeA +
    3.0 * data.gradeB +
    2.0 * data.gradeC +
    1.0 * data.gradeD +
    0.0 * data.gradeF;

  return Math.round((points / total) * 100) / 100;
}

/**
 * Convert a section's grade data into Recharts-ready chart data.
 * Each entry: { grade: "A", count: 12, percentage: 34.5 }
 */
export function toChartData(data: GradeData): ChartDataPoint[] {
  const gradeMap: Record<string, number> = {
    A: data.gradeA,
    B: data.gradeB,
    C: data.gradeC,
    D: data.gradeD,
    F: data.gradeF,
    P: data.gradeP,
    NP: data.gradeNP,
    W: data.gradeW,
    I: data.gradeI,
  };

  const total = data.totalEnroll || 1; // Avoid division by zero

  return GRADE_ORDER.map((grade) => ({
    grade,
    count: gradeMap[grade],
    percentage: Math.round((gradeMap[grade] / total) * 1000) / 10,
  }));
}

/**
 * Aggregate multiple sections into a single combined distribution.
 * Used for showing an instructor's or course's overall distribution.
 */
export function aggregateGrades(sections: GradeData[]): GradeData {
  return sections.reduce(
    (acc, s) => ({
      gradeA: acc.gradeA + s.gradeA,
      gradeB: acc.gradeB + s.gradeB,
      gradeC: acc.gradeC + s.gradeC,
      gradeD: acc.gradeD + s.gradeD,
      gradeF: acc.gradeF + s.gradeF,
      gradeP: acc.gradeP + s.gradeP,
      gradeNP: acc.gradeNP + s.gradeNP,
      gradeW: acc.gradeW + s.gradeW,
      gradeI: acc.gradeI + s.gradeI,
      totalEnroll: acc.totalEnroll + s.totalEnroll,
    }),
    {
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
    }
  );
}

/**
 * Get a color class for a GPA value (for the GpaBadge component).
 */
export function gpaColor(gpa: number | null): string {
  if (gpa === null) return "bg-gray-400 text-white";
  if (gpa >= 3.5) return "bg-green-500 text-white";
  if (gpa >= 2.5) return "bg-yellow-400 text-black";
  if (gpa >= 2.0) return "bg-orange-500 text-white";
  return "bg-red-600 text-white";
}
