import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const instructorId = parseInt(params.id);
  if (isNaN(instructorId)) return NextResponse.json({ sections: [] }, { status: 400 });
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    include: {
      sections: { include: { course: true } },
    },
  });
  if (!instructor) return NextResponse.json({ sections: [] }, { status: 404 });
  return NextResponse.json({ sections: instructor.sections });
}
