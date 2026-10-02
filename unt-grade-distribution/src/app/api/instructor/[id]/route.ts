import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionOrigin } from "@/lib/cors";

const PG_INT_MAX = 2_147_483_647;

type RouteParams = Record<string, string | string[] | undefined>;

function coerceRouteParam(value: RouteParams[string]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<RouteParams> }
) {
  const originReject = validateExtensionOrigin(request);
  if (originReject) return originReject;

  const params = (await ctx.params) ?? {};
  const id = coerceRouteParam(params.id);
  const instructorId = Number(id);
  // Reject "", "1.5", "1e3", "Infinity", out-of-range, etc. before they reach
  // Prisma: Instructor.id is a Postgres Int (max 2147483647).
  if (!id || !/^\d+$/.test(id) || instructorId < 1 || instructorId > PG_INT_MAX) {
    return NextResponse.json({ sections: [] }, { status: 400 });
  }
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sections: {
        orderBy: [{ course: { prefix: "asc" } }, { course: { number: "asc" } }, { sectionNumber: "asc" }],
        select: {
          id: true,
          sectionNumber: true,
          gradeA: true,
          gradeB: true,
          gradeC: true,
          gradeD: true,
          gradeF: true,
          gradeP: true,
          gradeNP: true,
          gradeW: true,
          gradeI: true,
          totalEnroll: true,
          course: {
            select: {
              prefix: true,
              number: true,
              title: true,
            },
          },
        },
      },
    },
  });
  if (!instructor) {
    return NextResponse.json({ sections: [] }, { status: 404 });
  }
  return NextResponse.json(
    {
      sections: instructor.sections,
      instructor: {
        id: instructor.id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
      },
    },
  );
}
