import type { Course, Instructor, Section } from "@prisma/client";

/** Section with all relations loaded */
export type SectionWithRelations = Section & {
  course: Course;
  instructor: Instructor;
};

/** Search API response */
export interface SearchResult {
  courses: Array<{ id: number; prefix: string; number: string; title: string }>;
  instructors: Array<{ id: number | string; firstName: string; lastName: string }>;
}

/** Saved course item — stored in localStorage */
export interface CartItem {
  courseId: number;
  prefix: string;
  number: string;
  title: string;
  gpa: number | null;
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
  sectionCount: number;
}
