import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ courses: [], instructors: [] });
  }

  // Heuristic: if query starts with letters followed by a digit, search courses first
  const isCourseQuery = /^[A-Za-z]{1,4}\s?\d/.test(q);

  const [courses, instructors] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [
          // Match "CS 311" or "CS311" patterns
          {
            prefix: {
              startsWith: q.split(/\s|\d/)[0].toUpperCase(),
              mode: "insensitive",
            },
            number: {
              startsWith: q.replace(/^[A-Za-z]+\s*/, ""),
              mode: "insensitive",
            },
          },
          // Match by title
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, prefix: true, number: true, title: true },
      take: 10,
      orderBy: [{ prefix: "asc" }, { number: "asc" }],
    }),
    prisma.instructor.findMany({
      where: {
        OR: [
          { lastName: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
      take: 10,
      orderBy: { lastName: "asc" },
    }),
  ]);

  // If it looks like a course query, prioritize courses in the response
  return NextResponse.json({
    courses: isCourseQuery ? courses : courses.slice(0, 5),
    instructors: isCourseQuery ? instructors.slice(0, 5) : instructors,
  });
}
