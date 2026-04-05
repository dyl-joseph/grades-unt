import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatServerTiming,
  recordSearchCacheHit,
  recordSearchCacheMiss,
  recordSearchError,
  recordSearchQuery,
  recordSearchSkip,
} from "@/lib/metrics";

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
  const requestStart = performance.now();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    const durationMs = performance.now() - requestStart;
    recordSearchSkip(q, durationMs);

    return NextResponse.json(
      { courses: [], instructors: [] },
      {
        headers: {
          "Server-Timing": formatServerTiming([{ name: "search", description: "skip", durationMs }]),
        },
      }
    );
  }

  const cacheKey = q.toLowerCase();

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    const durationMs = performance.now() - requestStart;
    recordSearchCacheHit(cacheKey, durationMs, {
      courses: cached.courses.length,
      instructors: cached.instructors.length,
    });

    return NextResponse.json(cached, {
      headers: {
        "Server-Timing": formatServerTiming([
          { name: "search", description: "cache-hit", durationMs },
        ]),
      },
    });
  }

  // Heuristic: if query starts with letters followed by a digit, search courses first
  const isCourseQuery = /^[A-Za-z]{1,4}\s?\d/.test(q);
  const courseTake = isCourseQuery ? 10 : 5;
  const instructorTake = isCourseQuery ? 5 : 10;

  try {
    const dbStart = performance.now();
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
        take: courseTake,
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
        take: instructorTake,
        orderBy: { lastName: "asc" },
      }),
    ]);

    const result = { courses, instructors };
    const dbDurationMs = performance.now() - dbStart;
    const totalDurationMs = performance.now() - requestStart;

    // Cache the result
    setInCache(cacheKey, result);
    recordSearchCacheMiss();
    recordSearchQuery(cacheKey, totalDurationMs, {
      courses: result.courses.length,
      instructors: result.instructors.length,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Server-Timing": formatServerTiming([
          { name: "search", description: "cache-miss", durationMs: totalDurationMs },
          { name: "db", durationMs: dbDurationMs },
        ]),
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Search API error:", error);
    const durationMs = performance.now() - requestStart;
    recordSearchError(cacheKey, durationMs, error);
    return NextResponse.json(
      { error: "Database query failed", details: error instanceof Error ? error.message : String(error) },
      {
        status: 500,
        headers: {
          "Server-Timing": formatServerTiming([{ name: "search", description: "error", durationMs }]),
        },
      }
    );
  }
}
