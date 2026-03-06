import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ── In-memory LRU cache ─────────────────────────────── */
const MAX_ENTRIES = 500;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: { courses: unknown[]; instructors: unknown[] };
  ts: number;
}

const cache = new Map<string, CacheEntry>();

function getFromCache(key: string): CacheEntry["data"] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Move to end (most recently used)
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setInCache(key: string, data: CacheEntry["data"]) {
  // Evict oldest entry if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

/* ── Search handler ──────────────────────────────────── */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ courses: [], instructors: [] });
  }

  const cacheKey = q.toLowerCase();

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Heuristic: if query starts with letters followed by a digit, search courses first
  const isCourseQuery = /^[A-Za-z]{1,4}\s?\d/.test(q);

  try {
    // Run both queries in parallel for faster response
    const [courses, instructors] = await Promise.all([
      prisma.course.findMany({
        where: {
          OR: [
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

    const result = {
      courses: isCourseQuery ? courses : courses.slice(0, 5),
      instructors: isCourseQuery ? instructors.slice(0, 5) : instructors,
    };

    // Cache the result
    setInCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Database query failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
