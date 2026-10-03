"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import GpaBadge from "@/components/GpaBadge";
import { fetchManifest } from "@/lib/encryptedData";
import { coursesInDepartment } from "@/lib/homeStats";
import { useHomeStats } from "@/hooks/useHomeData";

type Course = ReturnType<typeof coursesInDepartment>[number];

export default function DepartmentPage() {
  const params = useParams<{ prefix: string }>();
  const prefix = decodeURIComponent(params?.prefix ?? "").toUpperCase();
  const stats = useHomeStats();

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let active = true;
    fetchManifest()
      .then((manifest) => {
        if (active) setCourses(coursesInDepartment(manifest, prefix));
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [prefix]);

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!courses || !query) return courses ?? [];
    return courses.filter(
      (course) => course.number.includes(query) || course.title.toLowerCase().includes(query)
    );
  }, [courses, filter]);

  const avgGpa = stats?.departments[prefix]?.avgGpa;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-red-600 dark:text-red-300">Could not load courses. Please try again.</p>
      </div>
    );
  }

  if (courses && courses.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-ui-text">No courses found for {prefix}</h1>
        <Link href="/#departments" className="mt-4 inline-block font-medium text-primary underline underline-offset-4 dark:text-ui-accent">
          Browse all departments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy={courses === null}>
      <Link href="/#departments" className="text-sm font-medium text-jungle-vine hover:text-primary dark:text-ui-muted dark:hover:text-ui-accent">
        &larr; All departments
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold text-primary dark:text-ui-accent">{prefix}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-ui-muted">
            <span>{courses ? `${courses.length.toLocaleString()} courses` : "Loading courses…"}</span>
            {typeof avgGpa === "number" && (
              <span className="flex items-center gap-1.5">Department GPA: <GpaBadge gpa={avgGpa} /></span>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="department-filter" className="sr-only">Filter courses in {prefix}</label>
          <input
            id="department-filter"
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by number or title"
            className="w-64 max-w-full rounded-2xl border border-jungle-tan-dark/30 bg-jungle-tan-light px-4 py-2 text-sm text-gray-900 placeholder:text-gray-500/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-ui-border dark:bg-ui-surface dark:text-ui-text dark:placeholder:text-ui-muted dark:focus:border-ui-accent dark:focus:ring-ui-accent/30"
          />
        </div>
      </div>

      {courses && (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <li key={course.number}>
              <Link
                href={`/course/${course.prefix}/${course.number}`}
                className="flex h-full flex-col rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light px-4 py-3 shadow-sm transition-shadow hover:border-primary/50 hover:shadow-md dark:border-ui-border dark:bg-ui-surface dark:hover:border-ui-accent"
              >
                <span className="font-semibold text-gray-900 dark:text-ui-text">{course.prefix} {course.number}</span>
                <span className="text-sm text-gray-500 dark:text-ui-muted">{course.title}</span>
              </Link>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="text-sm text-gray-600 dark:text-ui-muted">No courses match &ldquo;{filter}&rdquo;.</li>
          )}
        </ul>
      )}
    </div>
  );
}
