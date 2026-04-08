import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { aggregateGrades, calculateGPA, toChartData } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import GradeChart from "@/components/GradeChart";

export const dynamic = "force-static";
export const revalidate = 3600; // ISR: regenerate every hour

const getInstructorDetail = unstable_cache(
  async (instructorId: number) => {
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        sections: {
          include: { course: true },
          orderBy: [{ course: { prefix: "asc" } }, { course: { number: "asc" } }],
        },
      },
    });

    if (!instructor) {
      return null;
    }

    const overallAggregate = aggregateGrades(instructor.sections);
    const overallGPA = calculateGPA(overallAggregate);

    const courseMap = new Map<
      number,
      {
        course: { id: number; prefix: string; number: string; title: string };
        sections: typeof instructor.sections;
      }
    >();

    for (const section of instructor.sections) {
      const existing = courseMap.get(section.courseId);
      if (existing) {
        existing.sections.push(section);
      } else {
        courseMap.set(section.courseId, {
          course: section.course,
          sections: [section],
        });
      }
    }

    return {
      instructor,
      overallAggregate,
      overallGPA,
      courseGroups: Array.from(courseMap.values()),
    };
  },
  ["instructor-detail"],
  { revalidate: 3600, tags: ["instructor-detail"] } // 1 hour
);

type InstructorDetail = NonNullable<Awaited<ReturnType<typeof getInstructorDetail>>>;

interface InstructorPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorPage({ params }: InstructorPageProps) {
  const { id } = await params;
  const instructorId = parseInt(id);

  if (isNaN(instructorId)) {
    notFound();
  }

  const detail = await getInstructorDetail(instructorId);

  if (!detail) {
    notFound();
  }

  const { instructor, overallAggregate, overallGPA, courseGroups } = detail as InstructorDetail;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">
            {instructor.firstName} {instructor.lastName}
          </h1>
          <div className="flex items-start gap-2">
            <a
              href={`/compare?type=instructor&a=${instructor.id}`}
              className="inline-block rounded bg-blue-600 px-3 py-1 font-semibold text-white transition hover:bg-blue-700"
              title="Compare with another instructor"
            >
              Compare
            </a>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-green-200/70">
          <span className="flex items-center gap-1.5">
            Overall GPA: <GpaBadge gpa={overallGPA} />
          </span>
          <span>{instructor.sections.length} sections</span>
          <span>
            {courseGroups.length} course{courseGroups.length !== 1 ? "s" : ""}{" "}
            taught
          </span>
        </div>
      </div>
      <div className="mb-10 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-green-100">
          Aggregate Grade Distribution
        </h2>
        <GradeChart data={toChartData(overallAggregate)} />
      </div>

      {/* Course groups */}
      {courseGroups.map(({ course, sections }) => (
        <div key={course.id} className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">
            <Link
              href={`/course/${course.prefix}/${course.number}`}
              className="text-primary hover:underline dark:text-jungle-leaf"
            >
              {course.prefix} {course.number}
            </Link>
            <span className="ml-2 text-gray-500 dark:text-green-300/60">
              — {course.title}
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <SectionCard key={section.id} section={{ ...section, instructor }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
