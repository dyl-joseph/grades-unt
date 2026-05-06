export const GRADE_ORDER = ["A", "B", "C", "D", "F", "P", "NP", "W", "I"] as const;

export const LETTER_GRADES = ["A", "B", "C", "D", "F"] as const;

export const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};

export const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#facc15",
  C: "#f97316",
  D: "#ef4444",
  F: "#991b1b",
  P: "#60a5fa",
  NP: "#a78bfa",
  W: "#6b7280",
  I: "#9ca3af",
};

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

export interface ChartDataPoint {
  grade: string;
  count: number;
  percentage: number;
}

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

  const total = data.totalEnroll || 1;

  return GRADE_ORDER.map((grade) => ({
    grade,
    count: gradeMap[grade],
    percentage: Math.round((gradeMap[grade] / total) * 1000) / 10,
  }));
}

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
      gradeA: 0, gradeB: 0, gradeC: 0, gradeD: 0, gradeF: 0,
      gradeP: 0, gradeNP: 0, gradeW: 0, gradeI: 0, totalEnroll: 0,
    }
  );
}

export function gpaColorHex(gpa: number | null): { bg: string; color: string } {
  if (gpa === null) return { bg: "#9ca3af", color: "#fff" };
  if (gpa >= 3.5) return { bg: "#22c55e", color: "#fff" };
  if (gpa >= 2.5) return { bg: "#facc15", color: "#000" };
  if (gpa >= 2.0) return { bg: "#f97316", color: "#fff" };
  return { bg: "#dc2626", color: "#fff" };
}
