import type { Course, Instructor, Section } from "@prisma/client";

/** Section with all relations loaded */
export type SectionWithRelations = Section & {
  course: Course;
  instructor: Instructor;
};

/** Search API response */
export interface SearchResult {
  courses: Pick<Course, "id" | "prefix" | "number" | "title">[];
  instructors: Pick<Instructor, "id" | "firstName" | "lastName">[];
}
