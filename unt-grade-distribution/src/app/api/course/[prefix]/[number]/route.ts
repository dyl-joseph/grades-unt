import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: any }) {
  const params = await Promise.resolve(context.params) as { prefix: string; number: string };
  const { prefix, number } = params;
  const course = await prisma.course.findUnique({
    where: { prefix_number: { prefix, number } },
    include: {
      sections: { include: { instructor: true } },
    },
  });
  if (!course) return NextResponse.json({ sections: [] }, { status: 404 });
  return NextResponse.json({ sections: course.sections });
}
