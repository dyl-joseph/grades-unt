"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { aggregateGrades, calculateGPA, toChartData } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import GradeChart from "@/components/GradeChart";
import { SemesterCheckboxGroup, type SemesterSelection } from "@/components/SemesterControls";
import { fromInstructorSlug, loadInstructorSections } from "@/lib/encryptedData";
import { groupBySemester, semesterLabel } from "@/lib/semester";

type SectionWithCourse = {
  sectionNumber: string;
  year: string | null;
  term: string | null;
  instructor: { firstName: string; lastName: string };
  grades: { A: number; B: number; C: number; D: number; F: number; P: number; NP: number; W: number; I: number };
  course: { prefix: string; number: string; title: string };
};

export default function InstructorPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id || "";
  const { firstName, lastName } = useMemo(() => fromInstructorSlug(slug), [slug]);

  const [sections, setSections] = useState<SectionWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributionSemesters, setDistributionSemesters] = useState<SemesterSelection>("all");
  const [sectionSemesters, setSectionSemesters] = useState<SemesterSelection>("all");

  useEffect(() => {
    if (!firstName || !lastName) return;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

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
        year: s.year,
        term: s.term,
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
  const semesterGroups = useMemo(() => groupBySemester(normalizedSections), [normalizedSections]);
  const semesterLabels = useMemo(() => semesterGroups.map((group) => group.label), [semesterGroups]);
  const summarySemesterLabels = useMemo(() => [...semesterLabels].reverse(), [semesterLabels]);
  const activeDistributionSemesterLabels = distributionSemesters === "all"
    ? semesterLabels
    : distributionSemesters.filter((label) => semesterLabels.includes(label));
  const distributionSections = useMemo(
    () => distributionSemesters === "all"
      ? normalizedSections
      : normalizedSections.filter((section) => activeDistributionSemesterLabels.includes(semesterLabel(section))),
    [activeDistributionSemesterLabels, distributionSemesters, normalizedSections]
  );
  const distributionAggregate = useMemo(() => aggregateGrades(distributionSections), [distributionSections]);
  const distributionGPA = useMemo(() => calculateGPA(distributionAggregate), [distributionAggregate]);
  const visibleSemesterLabels = sectionSemesters === "all"
    ? summarySemesterLabels
    : summarySemesterLabels.filter((label) => sectionSemesters.includes(label));
  const visibleSemesterGroups = useMemo(
    () => semesterGroups.filter((group) => visibleSemesterLabels.includes(group.label)),
    [semesterGroups, visibleSemesterLabels]
  );
  const visibleSections = useMemo(
    () => normalizedSections.filter((section) => visibleSemesterLabels.includes(semesterLabel(section))),
    [normalizedSections, visibleSemesterLabels]
  );
  const allCourseCount = useMemo(
    () => new Set(normalizedSections.map((section) => `${section.course.prefix}:${section.course.number}`)).size,
    [normalizedSections]
  );

  const courseGroups = useMemo(() => {
    const map = new Map<string, { course: { prefix: string; number: string; title: string }; sections: typeof normalizedSections }>();
    for (const section of visibleSections) {
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
  }, [visibleSections]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-live="polite">
        <div className="mb-8 animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded-full bg-jungle-tan-dark/40 dark:bg-green-950/60" />
          <div className="flex gap-4">
            <div className="h-4 w-28 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="h-4 w-24 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="h-4 w-36 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          </div>
        </div>
        <div className="mb-10 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
          <div className="mb-4 h-5 w-72 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          <div className="h-72 rounded-2xl bg-jungle-tan-dark/20 dark:bg-green-950/30" />
        </div>
        <div className="space-y-10">
          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              <div className="h-5 w-52 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((__, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="h-40 rounded-2xl border border-jungle-tan-dark/30 bg-jungle-tan-light/70 p-4 shadow-sm animate-pulse dark:border-green-900/60 dark:bg-jungle-canopy/40"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-red-600 dark:text-red-300">{error}</div>;
  }

  if (!firstName || !lastName) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-red-600 dark:text-red-300">Instructor not found</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 break-words text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">{firstName} {lastName}</h1>
          <div className="flex w-full flex-wrap items-start justify-end gap-2 sm:w-auto">
            <a
              href={`/compare?type=instructor&a=${encodeURIComponent(`${lastName},${firstName}`)}`}
              className="inline-flex items-center whitespace-nowrap rounded-lg border border-green-400/50 bg-green-50 px-3 py-1.5 font-medium text-green-700 transition-all hover:border-green-500/70 hover:bg-green-100 dark:border-green-600/50 dark:bg-green-900/20 dark:text-green-200 dark:hover:border-green-500 dark:hover:bg-green-900/40"
              title="Compare with another instructor"
            >
              Compare
            </a>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-green-200/70">
          <span className="flex items-center gap-1.5">Overall GPA: <GpaBadge gpa={overallGPA} /></span>
          <span>{normalizedSections.length} sections</span>
          <span>{semesterGroups.length} semester{semesterGroups.length !== 1 ? "s" : ""}</span>
          <span>{allCourseCount} course{allCourseCount !== 1 ? "s" : ""} taught</span>
        </div>
      </div>

      <div className="mb-10 min-w-0 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-4 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60 sm:p-6">
        <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-green-100">Grade Distribution</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-green-200/70">
              <span>{distributionSemesters === "all" ? "All semesters" : `${activeDistributionSemesterLabels.length} selected`}</span>
              <span aria-hidden="true">·</span>
              <span>{distributionSections.length} section{distributionSections.length !== 1 ? "s" : ""}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">GPA: <GpaBadge gpa={distributionGPA} /></span>
            </div>
          </div>
          <div className="shrink-0 self-start">
            <SemesterCheckboxGroup
              id="instructor-distribution-semester"
              labels={semesterLabels}
              value={distributionSemesters}
              onChange={setDistributionSemesters}
            />
          </div>
        </div>
        <GradeChart data={toChartData(distributionAggregate)} />
      </div>

      <div className="mb-10 min-w-0 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-4 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60 sm:p-5">
        <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-green-100">Semester Summary</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-green-200/70">
              Choose the semesters to include in the summary.
            </p>
          </div>
          <div className="shrink-0 self-start text-sm font-medium text-gray-500 dark:text-green-200/70">
            {sectionSemesters === "all" ? "All semesters" : `${visibleSemesterLabels.length} selected`}
          </div>
        </div>
        <div className="mb-5 rounded-2xl border border-jungle-tan-dark/20 bg-jungle-tan/65 px-4 py-4 shadow-sm dark:border-green-900/50 dark:bg-green-950/20 sm:px-5">
          <SemesterCheckboxGroup
            id="instructor-summary-semesters"
            labels={summarySemesterLabels}
            value={sectionSemesters}
            onChange={setSectionSemesters}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSemesterGroups.map(({ label, items }) => {
            const semesterAggregate = aggregateGrades(items);
            return (
              <div key={label} className="rounded-2xl border border-jungle-tan-dark/20 bg-jungle-tan/70 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-green-900/60 dark:bg-green-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-jungle-vine dark:text-green-300/80">{label}</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-green-100">{items.length}</div>
                    <div className="text-xs text-gray-500 dark:text-green-200/70">section{items.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary dark:bg-green-400/15 dark:text-green-300">
                    GPA {calculateGPA(semesterAggregate)?.toFixed(2) ?? "N/A"}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-green-200/70">
                  <span>{semesterAggregate.totalEnroll.toLocaleString()} students</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-green-100">Courses in Selected Semesters</h2>
      {courseGroups.map(({ course, sections }) => (
        <div key={`${course.prefix}-${course.number}`} className="mb-10">
          <h3 className="mb-4 flex min-w-0 flex-wrap items-baseline gap-x-2 text-lg font-semibold">
            <Link href={`/course/${course.prefix}/${course.number}`} className="text-primary hover:underline dark:text-jungle-leaf">
              {course.prefix} {course.number}
            </Link>
            <span className="min-w-0 break-words text-gray-500 dark:text-green-300/60">— {course.title}</span>
          </h3>
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
