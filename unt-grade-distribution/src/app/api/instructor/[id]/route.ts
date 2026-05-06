import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionOrigin } from "@/lib/cors";
import { checkInstallRateLimit } from "@/lib/rate-limit";

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

  const installLimit = checkInstallRateLimit(request);
  if (!installLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(installLimit.retryAfter ?? 60) } }
    );
  }

  const params = (await ctx.params) ?? {};
  const id = coerceRouteParam(params.id);
  const instructorId = Number(id);
  if (isNaN(instructorId)) {
    return NextResponse.json({ sections: [] }, { status: 400 });
  }
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    include: {
      sections: { include: { course: true } },
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
