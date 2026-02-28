"use client";

import Link from "next/link";
import GpaBadge from "./GpaBadge";
import GradeChart from "./GradeChart";
import { calculateGPA, toChartData } from "@/lib/grades";
import type { SectionWithRelations } from "@/lib/types";

interface SectionCardProps {
  section: SectionWithRelations;
  showCourse?: boolean;
}

export default function SectionCard({
  section,
  showCourse = false,
}: SectionCardProps) {
  const gpa = calculateGPA(section);
  const chartData = toChartData(section);

  return (
    <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-green-900 dark:bg-jungle-canopy/60">
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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Section {section.sectionNumber}
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <Link
              href={`/instructor/${section.instructorId}`}
              className="text-sm font-medium text-gray-900 hover:text-primary dark:text-green-100 dark:hover:text-jungle-leaf"
            >
              {section.instructor.lastName}, {section.instructor.firstName}
            </Link>
          </div>
        </div>
        <GpaBadge gpa={gpa} />
      </div>
      <GradeChart data={chartData} height={200} />
      <div className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
        {section.totalEnroll} students
      </div>
    </div>
  );
}
