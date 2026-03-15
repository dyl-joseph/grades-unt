import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // ISR: regenerate every hour
import { aggregateGrades, calculateGPA, toChartData } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import GradeChart from "@/components/GradeChart";
import CourseSaveButton from "@/components/CourseSaveButton";
import ShareButton from "@/components/ShareButton";
import type { Section, Instructor } from "@prisma/client";

const getCourse = unstable_cache(
  async (prefix: string, number: string) => {
    return prisma.course.findUnique({
      where: {
        prefix_number: { prefix, number },
      },
      include: {
        sections: {
          include: { instructor: true },
          orderBy: { instructor: { lastName: "asc" } },
        },
      },
    });
  },
  ["course-detail"],
  { revalidate: 3600 } // 1 hour
);

interface CoursePageProps {
  params: Promise<{ prefix: string; number: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { prefix, number } = await params;

  const course = await getCourse(prefix.toUpperCase(), number);

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">
            {course.prefix} {course.number}{" "}
            <span className="text-gray-500 dark:text-green-300/60">—</span>{" "}
            {course.title}
          </h1>
          <div className="flex items-start gap-2">
            <ShareButton url={`/course/${course.prefix}/${course.number}`} />
            <CourseSaveButton
              item={{
                courseId: course.id,
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
                sectionCount: course.sections.length,
              }}
            />
            {/* Compare Button */}
            <a
              href={`/compare?type=course&a=${course.prefix}:${course.number}`}
              className="inline-block px-3 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              title="Compare with another course"
            >
              Compare
            </a>
          </div>
        </div>
        </div>
          <span className="flex items-center gap-1.5">
            Overall GPA: <GpaBadge gpa={overallGPA} />
          </span>
          <span>{course.sections.length} sections</span>
          <span>{aggregate.totalEnroll.toLocaleString()} total students</span>
        </div>
      </div>

      {/* Aggregate chart */}
      <div className="mb-10 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
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
