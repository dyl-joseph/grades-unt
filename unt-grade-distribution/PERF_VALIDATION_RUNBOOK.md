# Performance validation runbook

This runbook covers the checks needed to validate the load/performance goals for:

- `/api/search` suggestion latency
- course page TTFB
- instructor page TTFB
- Supabase pooled connection correctness

## 1) What to measure

Capture the following for each test run:

- **Search endpoint**
  - Request path: `/api/search?q=<query>`
  - Response header: `Server-Timing`
  - Response header: `Cache-Control`
  - Success criteria: p95 response latency ≤ 2s under representative load
- **Course and instructor pages**
  - Measure server response / TTFB for:
    - `/course/[prefix]/[number]`
    - `/instructor/[id]`
  - Check the page response in Vercel logs or an HTTP timing tool
  - Success criteria: p95 TTFB ≤ 2s under representative load

Because the app already emits `Server-Timing` on `/api/search`, the header is the fastest way to separate:

- `search` total time
- `db` time
- `cache-hit`, `cache-miss`, `cache-skip`, or `error`

## 2) Recommended validation flow on Vercel

1. Run the app on Vercel preview or production.
2. Generate a representative mix of queries:
   - title-contains searches
   - instructor name searches
   - course prefix/number searches
3. Load test with ~50 concurrent users.
4. Collect:
   - response times
   - `Server-Timing`
   - Vercel function logs
   - Vercel Analytics / Speed Insights route timings
5. Confirm the p95 values stay under 2 seconds.

If search is slow, use `Server-Timing` to determine whether the bottleneck is:

- total handler time
- database time
- cold starts / platform overhead

## 3) Headers and signals to capture

For search requests, inspect:

- `Server-Timing`
- `Cache-Control`
- status code

For page requests, inspect:

- response timing / TTFB from the load tool
- Vercel function logs for slow requests
- Speed Insights route metrics

## 4) Supabase env var expectations

Use the following split:

- `DATABASE_URL`
  - production / Vercel serverless
  - should point at the **Supabase pooler** connection string
  - current repo expectation matches `src/lib/prisma.ts`, which prefers `DATABASE_URL` in production
- `DIRECT_URL`
  - local development and bulk operations
  - should point at the direct Supabase Postgres host (`db.<project-ref>.supabase.co:5432`)

The repo already documents this in `.env.example`:

- `DATABASE_URL="...pooler.supabase.com:6543/postgres?pgbouncer=true"`
- `DIRECT_URL="...db.<project-ref>.supabase.co:5432/postgres"`

## 5) Vercel runtime settings to consider

Keep runtime tuning minimal and compatible with the current Next.js setup:

- Prefer the default Node.js runtime for Prisma-backed routes unless a route has been explicitly moved elsewhere.
- Avoid changing semantics for search caching:
  - keep title-contains search
  - keep existing API cache headers unless a later task changes them deliberately
- If a route is slow under load, verify whether the issue is:
  - function cold starts
  - DB connection setup
  - page data fetching

## 6) Suggested pass/fail checklist

- PASS: `/api/search` p95 ≤ 2s at ~50 concurrent users
- PASS: course page p95 TTFB ≤ 2s
- PASS: instructor page p95 TTFB ≤ 2s
- PASS: title-contains search still returns expected matches
- PASS: instructor name search still returns expected matches
- PASS: production uses pooled `DATABASE_URL`
- PASS: local/dev bulk ops use `DIRECT_URL`

