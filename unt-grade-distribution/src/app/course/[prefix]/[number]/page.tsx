import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aggregateGrades, calculateGPA, toChartData } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import GradeChart from "@/components/GradeChart";
import type { Section, Instructor } from "@prisma/client";

interface CoursePageProps {
  params: Promise<{ prefix: string; number: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { prefix, number } = await params;

  const course = await prisma.course.findUnique({
    where: {
      prefix_number: {
        prefix: prefix.toUpperCase(),
        number: number,
      },
    },
    include: {
      sections: {
        include: { instructor: true },
        orderBy: { instructor: { lastName: "asc" } },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const aggregate = aggregateGrades(course.sections);
  const overallGPA = calculateGPA(aggregate);
  const aggregateChartData = toChartData(aggregate);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">
          {course.prefix} {course.number}{" "}
          <span className="text-gray-500 dark:text-green-300/60">—</span>{" "}
          {course.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-green-200/70">
          <span className="flex items-center gap-1.5">
            Overall GPA: <GpaBadge gpa={overallGPA} />
          </span>
          <span>{course.sections.length} sections</span>
          <span>{aggregate.totalEnroll.toLocaleString()} total students</span>
        </div>
      </div>

      {/* Aggregate chart */}
      <div className="mb-10 rounded-xl border border-green-200 bg-white p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-green-100">
          Aggregate Grade Distribution
        </h2>
        <GradeChart data={aggregateChartData} />
      </div>

      {/* Sections grid */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-green-100">
        Sections
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {course.sections.map((section: Section & { instructor: Instructor }) => (
          <SectionCard
            key={section.id}
            section={{ ...section, course }}
          />
        ))}
      </div>
    </div>
  );
}
