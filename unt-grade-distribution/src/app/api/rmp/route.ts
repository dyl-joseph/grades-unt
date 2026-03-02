import { NextRequest, NextResponse } from "next/server";
import { searchProfessor } from "@/lib/rmp";

export async function GET(request: NextRequest) {
  const firstName = request.nextUrl.searchParams.get("firstName");
  const lastName = request.nextUrl.searchParams.get("lastName");

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  try {
    const professor = await searchProfessor(firstName, lastName);

    if (!professor) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      professor,
    });
  } catch (error) {
    console.error("RMP API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RMP data" },
      { status: 500 }
    );
  }
}
