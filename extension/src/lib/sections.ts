import type { Section, SectionCourse } from "./types";

export function courseKey(course: Pick<SectionCourse, "prefix" | "number">) {
  return `${course.prefix}:${course.number}`;
}

/** Group an instructor's sections by course, preserving API order. */
export function groupSectionsByCourse(sections: Section[]) {
  const groups = new Map<string, { key: string; course: SectionCourse; secs: Section[] }>();
  for (const section of sections) {
    if (!section.course) continue;
    const key = courseKey(section.course);
    const existing = groups.get(key);
    if (existing) {
      existing.secs.push(section);
    } else {
      groups.set(key, { key, course: section.course, secs: [section] });
    }
  }
  return Array.from(groups.values());
}

/** Website instructor pages are keyed by "Last,First", not the API's numeric id. */
export function instructorPagePath(instructor: { firstName: string; lastName: string }) {
  return `/instructor/${encodeURIComponent(`${instructor.lastName},${instructor.firstName}`)}`;
}
