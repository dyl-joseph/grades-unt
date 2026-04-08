import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchHeaders, getSearchPlan } from "@/lib/search";
import {
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
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setInCache(key: string, data: CacheEntry["data"]) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    const durationMs = performance.now() - requestStart;
    recordSearchSkip(q, durationMs);
    return NextResponse.json(
      { courses: [], instructors: [] },
      { headers: buildSearchHeaders({ totalDurationMs: durationMs, cacheState: "skip", queryKind: "skip" }) }
    );
  }

  const { cacheKey, courseTake, instructorTake, prefix, number, queryKind } = getSearchPlan(q);

  const cached = getFromCache(cacheKey);
  if (cached) {
    const durationMs = performance.now() - requestStart;
    recordSearchCacheHit(
      cacheKey,
      durationMs,
      { courses: cached.courses.length, instructors: cached.instructors.length },
      queryKind
    );
    return NextResponse.json(cached, {
      headers: buildSearchHeaders({
        totalDurationMs: durationMs,
        cacheState: "hit",
        queryKind,
        resultCounts: { courses: cached.courses.length, instructors: cached.instructors.length },
      }),
    });
  }

  try {
    const dbStart = performance.now();
    const [courses, instructors] = await Promise.all([
      prisma.course.findMany({
        where: {
          OR: [
            ...(prefix && number
              ? [
                  {
                    prefix: { startsWith: prefix, mode: "insensitive" as const },
                    number: { startsWith: number, mode: "insensitive" as const },
                  },
                ]
              : []),
            { title: { contains: q, mode: "insensitive" as const } },
          ],
        },
        select: { id: true, prefix: true, number: true, title: true },
        take: courseTake,
        orderBy: [{ prefix: "asc" }, { number: "asc" }],
      }),
      prisma.instructor.findMany({
        where: {
          OR: [
            { lastName: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
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

    setInCache(cacheKey, result);
    recordSearchCacheMiss();
    recordSearchQuery(
      cacheKey,
      totalDurationMs,
      { courses: result.courses.length, instructors: result.instructors.length },
      queryKind
    );

    return NextResponse.json(result, {
      headers: buildSearchHeaders({
        totalDurationMs,
        dbDurationMs,
        cacheState: "miss",
        queryKind,
        resultCounts: { courses: result.courses.length, instructors: result.instructors.length },
      }),
    });
  } catch (error) {
    console.error("Search API error:", error);
    const durationMs = performance.now() - requestStart;
    recordSearchError(cacheKey, durationMs, error, queryKind);
    return NextResponse.json(
      { error: "Database query failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: buildSearchHeaders({ totalDurationMs: durationMs, cacheState: "error", queryKind }) }
    );
  }
}
