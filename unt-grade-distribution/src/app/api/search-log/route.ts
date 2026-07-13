import { NextRequest, NextResponse } from "next/server";
import { validateExtensionOrigin } from "@/lib/cors";

type SearchKind = "course" | "instructor" | "mixed" | "unknown";
type SearchSource = "site" | "compare" | "api" | "other";

type SearchLogPayload = {
  rawQuery?: unknown;
  normalizedQuery?: unknown;
  searchKind?: unknown;
  source?: unknown;
  coursePrefix?: unknown;
  courseNumber?: unknown;
  courseTitle?: unknown;
  instructorFirstName?: unknown;
  instructorLastName?: unknown;
  resultCountCourses?: unknown;
  resultCountInstructors?: unknown;
};

type SearchLogRow = {
  raw_query: string;
  normalized_query: string;
  search_kind: SearchKind;
  source: SearchSource;
  course_prefix: string | null;
  course_number: string | null;
  course_title: string | null;
  instructor_first_name: string | null;
  instructor_last_name: string | null;
  result_count_courses: number;
  result_count_instructors: number;
};

const SUPABASE_REST_SUFFIX = "/rest/v1/search_events";

function asTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function isSearchKind(value: unknown): value is SearchKind {
  return value === "course" || value === "instructor" || value === "mixed" || value === "unknown";
}

function isSearchSource(value: unknown): value is SearchSource {
  return value === "site" || value === "compare" || value === "api" || value === "other";
}

function normalizeQuery(rawQuery: string) {
  return rawQuery.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildRow(payload: SearchLogPayload): SearchLogRow | null {
  if (typeof payload.rawQuery !== "string" || payload.rawQuery.trim().length === 0) return null;

  const rawQuery = payload.rawQuery;
  const normalizedQuery = asTrimmedString(payload.normalizedQuery) ?? normalizeQuery(rawQuery);
  const searchKind = isSearchKind(payload.searchKind) ? payload.searchKind : "unknown";
  const source = isSearchSource(payload.source) ? payload.source : "site";

  return {
    raw_query: rawQuery,
    normalized_query: normalizedQuery,
    search_kind: searchKind,
    source,
    course_prefix: asTrimmedString(payload.coursePrefix),
    course_number: asTrimmedString(payload.courseNumber),
    course_title: asTrimmedString(payload.courseTitle),
    instructor_first_name: asTrimmedString(payload.instructorFirstName),
    instructor_last_name: asTrimmedString(payload.instructorLastName),
    result_count_courses: asInteger(payload.resultCountCourses),
    result_count_instructors: asInteger(payload.resultCountInstructors),
  };
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

async function insertSearchEvent(row: SearchLogRow) {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false as const, status: 503, error: "Supabase logging is not configured" };
  }

  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}${SUPABASE_REST_SUFFIX}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    return { ok: false as const, status: response.status };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  const originReject = validateExtensionOrigin(request);
  if (originReject) return originReject;

  let payload: SearchLogPayload;

  try {
    payload = (await request.json()) as SearchLogPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const row = buildRow(payload);
  if (!row) {
    return NextResponse.json({ error: "rawQuery is required" }, { status: 400 });
  }

  const result = await insertSearchEvent(row);
  if (!result.ok) {
    console.error("Search log insert failed", { status: result.status, searchKind: row.search_kind, source: row.source });
    return NextResponse.json({ error: "Failed to record search" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}