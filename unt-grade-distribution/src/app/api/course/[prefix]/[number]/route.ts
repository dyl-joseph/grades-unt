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
  const prefix = coerceRouteParam(params.prefix);
  const number = coerceRouteParam(params.number);

  if (!prefix || !number) {
    return NextResponse.json({ sections: [] }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { prefix_number: { prefix, number } },
    include: {
      sections: { include: { instructor: true } },
    },
  });
  if (!course) {
    return NextResponse.json({ sections: [] }, { status: 404 });
  }
  return NextResponse.json(
    {
      sections: course.sections,
      course: { prefix: course.prefix, number: course.number, title: course.title },
    },
  );
}
