"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { aggregateGrades, calculateGPA, toChartData } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import GradeChart from "@/components/GradeChart";
import { fromInstructorSlug, loadInstructorSections } from "@/lib/encryptedData";

type SectionWithCourse = {
  sectionNumber: string;
  instructor: { firstName: string; lastName: string };
  grades: { A: number; B: number; C: number; D: number; F: number; P: number; NP: number; W: number; I: number };
  course: { prefix: string; number: string; title: string };
};

export default function InstructorPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id || "";
  const { firstName, lastName } = useMemo(() => fromInstructorSlug(slug), [slug]);

  const [sections, setSections] = useState<SectionWithCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firstName || !lastName) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    loadInstructorSections(firstName, lastName)
      .then((data) => {
        if (!mounted) return;
        setSections(data as SectionWithCourse[]);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to decrypt instructor data");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [firstName, lastName]);

  const normalizedSections = useMemo(
    () =>
      sections.map((s, idx) => ({
        id: `${s.course.prefix}-${s.course.number}-${s.sectionNumber}-${idx}`,
        sectionNumber: s.sectionNumber,
        instructor: s.instructor,
        course: s.course,
        gradeA: s.grades.A,
        gradeB: s.grades.B,
        gradeC: s.grades.C,
        gradeD: s.grades.D,
        gradeF: s.grades.F,
        gradeP: s.grades.P,
        gradeNP: s.grades.NP,
        gradeW: s.grades.W,
        gradeI: s.grades.I,
        totalEnroll:
          s.grades.A + s.grades.B + s.grades.C + s.grades.D + s.grades.F + s.grades.P + s.grades.NP + s.grades.W + s.grades.I,
      })),
    [sections]
  );

  const overallAggregate = useMemo(() => aggregateGrades(normalizedSections), [normalizedSections]);
  const overallGPA = useMemo(() => calculateGPA(overallAggregate), [overallAggregate]);

  const courseGroups = useMemo(() => {
    const map = new Map<string, { course: { prefix: string; number: string; title: string }; sections: typeof normalizedSections }>();
    for (const section of normalizedSections) {
      const key = `${section.course.prefix}:${section.course.number}`;
      const existing = map.get(key);
      if (existing) {
        existing.sections.push(section);
      } else {
        map.set(key, {
          course: section.course,
          sections: [section],
        });
      }
    }
    return Array.from(map.values());
  }, [normalizedSections]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-8">Loading encrypted instructor data...</div>;
  }

  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-red-600 dark:text-red-300">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">{firstName} {lastName}</h1>
          <div className="flex items-start gap-2">
            <a
              href={`/compare?type=instructor&a=${encodeURIComponent(`${lastName},${firstName}`)}`}
              className="inline-block rounded bg-blue-600 px-3 py-1 font-semibold text-white transition hover:bg-blue-700"
              title="Compare with another instructor"
            >
              Compare
            </a>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-green-200/70">
          <span className="flex items-center gap-1.5">Overall GPA: <GpaBadge gpa={overallGPA} /></span>
          <span>{normalizedSections.length} sections</span>
          <span>{courseGroups.length} course{courseGroups.length !== 1 ? "s" : ""} taught</span>
        </div>
      </div>

      <div className="mb-10 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-green-100">Aggregate Grade Distribution</h2>
        <GradeChart data={toChartData(overallAggregate)} />
      </div>

      {courseGroups.map(({ course, sections }) => (
        <div key={`${course.prefix}-${course.number}`} className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">
            <Link href={`/course/${course.prefix}/${course.number}`} className="text-primary hover:underline dark:text-jungle-leaf">
              {course.prefix} {course.number}
            </Link>
            <span className="ml-2 text-gray-500 dark:text-green-300/60">— {course.title}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
