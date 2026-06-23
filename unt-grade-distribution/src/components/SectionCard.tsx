"use client";

import Link from "next/link";
import GpaBadge from "./GpaBadge";
import LazyChart from "./LazyChart";
import { calculateGPA, toChartData } from "@/lib/grades";
import ShareButton from "./ShareButton";
import { toInstructorSlug } from "@/lib/encryptedData";
import { semesterLabel } from "@/lib/semester";

type SectionCardData = {
  id: number | string;
  sectionNumber: string;
  instructorId?: number | string;
  instructor: { firstName: string; lastName: string };
  course: { prefix: string; number: string; title?: string };
  year?: string | null;
  term?: string | null;
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
};

interface SectionCardProps {
  section: SectionCardData;
  showCourse?: boolean;
}

export default function SectionCard({
  section,
  showCourse = false,
}: SectionCardProps) {
  const gpa = calculateGPA(section);
  const chartData = toChartData(section);
  const semester = semesterLabel(section);
  const instructorSlug = toInstructorSlug(
    section.instructor.firstName,
    section.instructor.lastName
  );

  return (
    <div className="rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-4 shadow-sm transition-shadow hover:shadow-md dark:border-green-900 dark:bg-jungle-canopy/60">
      <div className="mb-3 flex items-center justify-between">
        <div>
          {showCourse && (
            <Link
              href={`/course/${section.course.prefix}/${section.course.number}`}
              className="text-sm font-medium text-primary hover:underline dark:text-jungle-leaf"
            >
              {section.course.prefix} {section.course.number}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-jungle-tan-dark/20 px-2 py-0.5 text-xs font-semibold text-jungle-bark dark:bg-green-950/60 dark:text-green-200">
              {semester}
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Section {section.sectionNumber}
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <Link
              href={`/instructor/${instructorSlug}`}
              className="text-sm font-medium text-gray-900 hover:text-primary dark:text-green-100 dark:hover:text-jungle-leaf"
            >
              {section.instructor.lastName}, {section.instructor.firstName}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton url={`/instructor/${instructorSlug}`} compact />
          <GpaBadge gpa={gpa} />
        </div>
      </div>
      <LazyChart data={chartData} height={200} />
      <div className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
        {section.totalEnroll} students
      </div>
    </div>
  );
}
