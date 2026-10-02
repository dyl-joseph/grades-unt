import { NextRequest, NextResponse } from "next/server";
import { validateExtensionOrigin } from "@/lib/cors";
import { buildSearchLogRow, type SearchLogPayload, type SearchLogRow } from "@/lib/search-log";

import { readBoundedJson, requestBodyErrorResponse } from "@/lib/request-body";

const SUPABASE_REST_SUFFIX = "/rest/v1/search_events";

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
    payload = (await readBoundedJson(request, 4 * 1024)) as SearchLogPayload;
  } catch (error) {
    return requestBodyErrorResponse(error);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
  }
  const row = buildSearchLogRow(payload);
  if (!row) {
    return NextResponse.json({ error: "rawQuery is required for course searches" }, { status: 400 });
  }

  const result = await insertSearchEvent(row);
  if (!result.ok) {
    console.error("Search log insert failed", { status: result.status, searchKind: row.search_kind, source: row.source });
    return NextResponse.json({ error: "Failed to record search" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
