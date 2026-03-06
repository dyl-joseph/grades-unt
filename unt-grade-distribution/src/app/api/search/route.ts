import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_QUERY_LENGTH = 64;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const ALLOWED_QUERY_PATTERN = /^[\p{L}\p{N}\s.'-]+$/u;

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(clientIp);

  if (!existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientIp, { count: 1, windowStart: now });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  rateLimitStore.set(clientIp, existing);
  return false;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ courses: [], instructors: [] });
  }

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  if (!ALLOWED_QUERY_PATTERN.test(q)) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  // Heuristic: if query starts with letters followed by a digit, search courses first
  const isCourseQuery = /^[A-Za-z]{1,4}\s?\d/.test(q);

  try {
    // Run both queries in parallel for faster response
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
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
