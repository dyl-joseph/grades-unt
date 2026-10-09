"use client";

import Link from "next/link";
import GpaBadge from "@/components/GpaBadge";
import MiniDist from "./MiniDist";
import { useHomeStats } from "@/hooks/useHomeData";
import type { RankedCourse } from "@/lib/homeStats";

const CARD_CLASS =
  "glass-glossy min-w-0 rounded-2xl border border-white/40 p-4 dark:border-ui-border sm:p-5";

function RankedList({ title, subtitle, courses }: { title: string; subtitle: string; courses: RankedCourse[] }) {
  return (
    <section className={CARD_CLASS}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-ui-text">{title}</h2>
      <p className="mb-3 text-sm text-gray-500 dark:text-ui-muted">{subtitle}</p>
      <ol className="divide-y divide-jungle-tan-dark/25 dark:divide-ui-border">
        {courses.map((course) => (
          <li key={`${course.prefix}-${course.number}`}>
            <Link
              href={`/course/${course.prefix}/${course.number}`}
              className="group flex items-center gap-3 py-2.5 transition-transform motion-safe:hover:translate-x-0.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900 group-hover:text-primary dark:text-ui-text dark:group-hover:text-ui-accent">
                  {course.prefix} {course.number}
                </span>
                <span className="block truncate text-sm text-gray-500 dark:text-ui-muted">{course.title}</span>
              </span>
              {course.dist && <MiniDist dist={course.dist} className="hidden w-20 shrink-0 sm:flex" />}
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-ui-muted">
                {course.dfwRate.toFixed(0)}% D/F/W
              </span>
              <GpaBadge gpa={course.gpa} />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RankedCourses() {
  const stats = useHomeStats();
  if (!stats || (stats.easiest.length === 0 && stats.hardest.length === 0)) return null;

  const subtitle = `Intro courses (1000–2999) with ${stats.minStudents}+ letter grades, all semesters`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RankedList title="Highest average GPA" subtitle={subtitle} courses={stats.easiest} />
      <RankedList title="Lowest average GPA" subtitle={subtitle} courses={stats.hardest} />
    </div>
  );
}
