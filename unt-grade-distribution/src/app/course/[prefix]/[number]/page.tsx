"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { aggregateGrades, calculateGPA, toChartData } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import GradeChart from "@/components/GradeChart";
import CourseSaveButton from "@/components/CourseSaveButton";
import ShareButton from "@/components/ShareButton";
import { SemesterSelect, SemesterRangeBar } from "@/components/SemesterControls";
import { loadCourseByCode } from "@/lib/encryptedData";
import { groupBySemester, semesterLabel } from "@/lib/semester";

type CourseData = {
  prefix: string;
  number: string;
  title: string;
  sections: Array<{
    sectionNumber: string;
    instructor: { firstName: string; lastName: string };
    year: string | null;
    term: string | null;
    grades: { A: number; B: number; C: number; D: number; F: number; P: number; NP: number; W: number; I: number };
  }>;
};

function toSectionModel(course: CourseData) {
  return course.sections.map((s, idx) => ({
    id: `${course.prefix}-${course.number}-${s.sectionNumber}-${idx}`,
    sectionNumber: s.sectionNumber,
    year: s.year,
    term: s.term,
    instructor: s.instructor,
    course: { prefix: course.prefix, number: course.number, title: course.title },
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
  }));
}

function stableCourseId(prefix: string, number: string) {
  let hash = 0;
  const text = `${prefix}:${number}`;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export default function CoursePage() {
  const params = useParams<{ prefix: string; number: string }>();
  const router = useRouter();
  const prefix = (params?.prefix || "").toUpperCase();
  const number = params?.number || "";

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributionSemester, setDistributionSemester] = useState("all");

  useEffect(() => {
    if (!prefix || !number) return;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

    loadCourseByCode(prefix, number)
      .then((data) => {
        if (!mounted) return;
        setCourse(data as CourseData | null);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to decrypt course data");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [prefix, number]);

  const sections = useMemo(() => (course ? toSectionModel(course) : []), [course]);
  const aggregate = useMemo(() => aggregateGrades(sections), [sections]);
  const overallGPA = useMemo(() => calculateGPA(aggregate), [aggregate]);
  const semesterGroups = useMemo(() => groupBySemester(sections), [sections]);
  const semesterLabels = useMemo(() => semesterGroups.map((group) => group.label), [semesterGroups]);
  const summarySemesterLabels = useMemo(() => [...semesterLabels].reverse(), [semesterLabels]);
  const activeDistributionSemester = distributionSemester === "all" || semesterLabels.includes(distributionSemester)
    ? distributionSemester
    : "all";
  const distributionSections = useMemo(
    () => activeDistributionSemester === "all"
      ? sections
      : semesterGroups.find((group) => group.label === activeDistributionSemester)?.items ?? [],
    [activeDistributionSemester, sections, semesterGroups]
  );
  const distributionAggregate = useMemo(() => aggregateGrades(distributionSections), [distributionSections]);
  const distributionChartData = useMemo(() => toChartData(distributionAggregate), [distributionAggregate]);
  const distributionGPA = useMemo(() => calculateGPA(distributionAggregate), [distributionAggregate]);
  const [sectionLeftBoundary, setSectionLeftBoundary] = useState(0);
  const [sectionRightBoundary, setSectionRightBoundary] = useState(Math.min(1, summarySemesterLabels.length));

  useEffect(() => {
    const maxBoundary = summarySemesterLabels.length;
    setSectionLeftBoundary(0);
    setSectionRightBoundary(Math.min(2, maxBoundary));
  }, [summarySemesterLabels]);

  const visibleSemesterLabels = useMemo(() => {
    if (!summarySemesterLabels.length) return [];

    const left = Math.max(0, Math.min(sectionLeftBoundary, Math.max(0, summarySemesterLabels.length - 1)));
    const right = Math.max(left + 1, Math.min(sectionRightBoundary, summarySemesterLabels.length));

    return summarySemesterLabels.slice(left, right);
  }, [sectionLeftBoundary, sectionRightBoundary, summarySemesterLabels]);
  const visibleSemesterGroups = useMemo(
    () => semesterGroups.filter((group) => visibleSemesterLabels.includes(group.label)),
    [semesterGroups, visibleSemesterLabels]
  );
  const visibleSections = useMemo(
    () => sections.filter((section) => visibleSemesterLabels.includes(semesterLabel(section))),
    [sections, visibleSemesterLabels]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-live="polite">
        <div className="mb-8 animate-pulse space-y-4">
          <div className="h-8 w-3/5 rounded-full bg-jungle-tan-dark/40 dark:bg-green-950/60" />
          <div className="flex gap-3">
            <div className="h-9 w-24 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="h-9 w-28 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-28 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="h-4 w-20 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="h-4 w-32 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          </div>
        </div>
        <div className="mb-10 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
          <div className="mb-4 h-5 w-64 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          <div className="h-72 rounded-2xl bg-jungle-tan-dark/20 dark:bg-green-950/30" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 rounded-2xl border border-jungle-tan-dark/30 bg-jungle-tan-light/70 p-4 shadow-sm animate-pulse dark:border-green-900/60 dark:bg-jungle-canopy/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-4 text-red-600 dark:text-red-300">{error}</p>
        <button onClick={() => router.push("/")} className="rounded bg-blue-600 px-4 py-2 text-white">Go Home</button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-4 text-red-600 dark:text-red-300">Course not found</p>
        <button onClick={() => router.push("/")} className="rounded bg-blue-600 px-4 py-2 text-white">Go Home</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 break-words text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">
            {course.prefix} {course.number} <span className="text-gray-500 dark:text-green-300/60">—</span> {course.title}
          </h1>
          <div className="flex w-full flex-wrap items-start justify-end gap-2 sm:w-auto">
            <ShareButton url={`/course/${course.prefix}/${course.number}`} />
            <CourseSaveButton
              item={{
                courseId: stableCourseId(course.prefix, course.number),
                prefix: course.prefix,
                number: course.number,
                title: course.title,
                gpa: overallGPA,
                gradeA: aggregate.gradeA,
                gradeB: aggregate.gradeB,
                gradeC: aggregate.gradeC,
                gradeD: aggregate.gradeD,
                gradeF: aggregate.gradeF,
                gradeP: aggregate.gradeP,
                gradeNP: aggregate.gradeNP,
                gradeW: aggregate.gradeW,
                gradeI: aggregate.gradeI,
                totalEnroll: aggregate.totalEnroll,
                sectionCount: sections.length,
              }}
            />
            <a
              href={`/compare?type=course&a=${course.prefix}:${course.number}`}
              className="inline-flex items-center whitespace-nowrap rounded-lg border border-green-400/50 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-all hover:border-green-500/70 hover:bg-green-100 dark:border-green-600/50 dark:bg-green-900/20 dark:text-green-200 dark:hover:border-green-500 dark:hover:bg-green-900/40"
              title="Compare with another course"
            >
              Compare
            </a>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-green-200/70">
          <span className="flex items-center gap-1.5">Overall GPA: <GpaBadge gpa={overallGPA} /></span>
          <span>{sections.length} sections</span>
          <span>{semesterGroups.length} semester{semesterGroups.length !== 1 ? "s" : ""}</span>
          <span>{aggregate.totalEnroll.toLocaleString()} total students</span>
        </div>
      </div>

      <div className="mb-10 min-w-0 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-4 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60 sm:p-6">
        <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-green-100">Grade Distribution</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-green-200/70">
              <span>{activeDistributionSemester === "all" ? "All semesters" : activeDistributionSemester}</span>
              <span aria-hidden="true">·</span>
              <span>{distributionSections.length} section{distributionSections.length !== 1 ? "s" : ""}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">GPA: <GpaBadge gpa={distributionGPA} /></span>
            </div>
          </div>
          <div className="shrink-0 self-start">
            <SemesterSelect
              id="course-distribution-semester"
              labels={semesterLabels}
              value={activeDistributionSemester}
              onChange={setDistributionSemester}
            />
          </div>
        </div>
        <GradeChart data={distributionChartData} />
      </div>

      <div className="mb-10 min-w-0 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-4 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60 sm:p-5">
  <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-green-100">
        Sections by Semester
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-green-200/70">
        Drag the two bounds to choose a 1- or 2-semester window. The range can never collapse to zero width.
      </p>
    </div>
    <div className="shrink-0 self-start text-sm font-medium text-gray-500 dark:text-green-200/70">
      {visibleSemesterLabels.length === 1
        ? visibleSemesterLabels[0]
        : `${visibleSemesterLabels[0] ?? ""} to ${visibleSemesterLabels[1] ?? ""}`}
    </div>
  </div>

  <div className="mb-5 rounded-2xl border border-jungle-tan-dark/20 bg-white/55 px-4 py-4 shadow-sm dark:border-green-900/50 dark:bg-green-950/20 sm:px-5">
    <SemesterRangeBar
      labels={summarySemesterLabels}
      startBoundary={sectionLeftBoundary}
      endBoundary={sectionRightBoundary}
      onStartBoundaryChange={setSectionLeftBoundary}
      onEndBoundaryChange={setSectionRightBoundary}
    />
  </div>

  <div className="space-y-10">
    {visibleSemesterGroups.map(({ label, items }) => {
          const semesterAggregate = aggregateGrades(items);
          return (
            <section key={label}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-green-100">{label}</h3>
                <span className="text-sm text-gray-500 dark:text-green-200/70">{items.length} section{items.length !== 1 ? "s" : ""}</span>
                <span className="text-sm text-gray-500 dark:text-green-200/70">{semesterAggregate.totalEnroll.toLocaleString()} students</span>
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-green-200/70">GPA: <GpaBadge gpa={calculateGPA(semesterAggregate)} /></span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((section) => (
                  <SectionCard key={section.id} section={section} />
                ))}
              </div>
            </section>
          );
        })}
  </div>
</div>
    </div>
  );
}
