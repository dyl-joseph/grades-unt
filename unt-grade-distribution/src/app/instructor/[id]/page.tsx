import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { aggregateGrades, calculateGPA } from "@/lib/grades";
import GpaBadge from "@/components/GpaBadge";
import SectionCard from "@/components/SectionCard";
import RMPRating from "@/components/RMPRating";
import type { Section, Course } from "@prisma/client";

interface InstructorPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorPage({ params }: InstructorPageProps) {
  const { id } = await params;
  const instructorId = parseInt(id);

  if (isNaN(instructorId)) {
    notFound();
  }

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
    notFound();
  }

  const overallAggregate = aggregateGrades(instructor.sections);
  const overallGPA = calculateGPA(overallAggregate);

  // Group sections by course
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

  const courseGroups = Array.from(courseMap.values());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">
              {instructor.firstName} {instructor.lastName}
            </h1>
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
          
          {/* RateMyProfessors Integration */}
          <div className="w-full shrink-0 lg:w-72">
            <RMPRating
              firstName={instructor.firstName}
              lastName={instructor.lastName}
            />
          </div>
        </div>
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
            {sections.map((section: Section & { course: Course }) => (
              <SectionCard
                key={section.id}
                section={{ ...section, instructor }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
