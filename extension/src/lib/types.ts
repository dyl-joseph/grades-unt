export interface CourseResult {
  id: number;
  prefix: string;
  number: string;
  title: string;
}

export interface InstructorResult {
  id: number;
  firstName: string;
  lastName: string;
}

export interface SearchResult {
  courses: CourseResult[];
  instructors: InstructorResult[];
}

export interface SectionInstructor {
  id: number;
  firstName: string;
  lastName: string;
}

export interface SectionCourse {
  id: number;
  prefix: string;
  number: string;
  title: string;
}

export interface Section {
  id: number;
  sectionNumber: string;
  courseId: number;
  instructorId: number;
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
  instructor?: SectionInstructor;
  course?: SectionCourse;
}

export interface CourseDetailResponse {
  course: { prefix: string; number: string; title: string };
  sections: Section[];
}

export interface InstructorDetailResponse {
  instructor: { id: number; firstName: string; lastName: string };
  sections: Section[];
}

export type MessageType = "SEARCH" | "COURSE_DETAIL" | "INSTRUCTOR_DETAIL";

export interface ExtensionMessage {
  type: MessageType;
  payload: Record<string, string>;
}

export interface ExtensionResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
  status?: number;
}
