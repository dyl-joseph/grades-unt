# Performance validation runbook

This runbook validates the performance goals for the current encrypted static-data path and the remaining DB-backed backend API routes.

## 1. What to measure

### Public encrypted-data path

Measure these user-facing flows first:

- Home search suggestions using `/encrypted/manifest.json`
- Course page load and blob decrypt for `/course/[prefix]/[number]`
- Instructor page load and any required blob decrypts for `/instructor/[id]`
- Compare page aggregation and chart rendering

Suggested success signals:

- Manifest is cached after the first fetch.
- Course page p95 perceived load is under 2 seconds on representative devices/networks.
- Instructor page p95 perceived load is under 2 seconds for typical instructors.
- Browser decrypt time is not a major contributor in performance profiles.

### Backend/API compatibility path

The repo still contains DB-backed routes that should remain fast when used:

- `/api/search?q=<query>`
- `/api/course/[prefix]/[number]`
- `/api/instructor/[id]`

For `/api/search`, capture:

- `Server-Timing`
- `Cache-Control`
- `x-search-cache`
- `x-search-kind`
- status code

Suggested API success criteria:

- p95 response latency under 2 seconds under representative load.
- Course-code searches use the indexed prefix/number path.
- Name searches do not trigger unnecessary course-code predicates.
- Repeated searches hit cache where expected.

## 2. Recommended validation flow on Vercel

1. Open a Vercel preview or production deployment.
2. Test the encrypted static-data path:
   - search for a course code
   - search for an instructor
   - open course pages
   - open instructor pages
   - compare multiple items
3. Record browser timings, Speed Insights, and console/network errors.
4. If validating backend API routes, run a representative query mix:
   - course prefix/number queries, for example `CS 10`
   - instructor names, for example `smith`
   - title searches, for example `accounting`
5. Capture Vercel function logs and `Server-Timing` headers.
6. Confirm p95 values stay within the target budget.

## 3. Local checks before performance testing

```bash
cd unt-grade-distribution
npm test
npx tsc --noEmit
DATABASE_URL="postgresql://user:***@localhost:5432/db" DIRECT_URL="postgresql://user:***@localhost:5432/db" npm run build
```

If lint is run, report existing unrelated lint failures separately from the performance change.

## 4. Database environment expectations

Use this split for Prisma-backed tools/routes:

- `DATABASE_URL`
  - production/serverless runtime
  - should use the Supabase pooler connection string
  - used by `src/lib/prisma.ts` in production
- `DIRECT_URL`
  - local development and bulk operations
  - should use the direct Supabase Postgres host

The public encrypted-data path should work without a live database query as long as the encrypted assets and `NEXT_PUBLIC_DATA_KEY` are present.

## 5. Signals to inspect

### Browser/static path

- Network waterfall for `/encrypted/manifest.json`
- Network waterfall for `/encrypted/blobs/*.bin`
- Network waterfall for `/encrypted/blobs/*.meta.json`
- WebCrypto decrypt timing from browser profiles when needed
- Vercel Speed Insights route metrics

### Backend/API path

- `Server-Timing`
- Vercel function duration
- cache hit/miss headers
- database query time
- cold starts
- connection errors

## 6. Pass/fail checklist

- PASS: public search works from the encrypted manifest.
- PASS: course pages decrypt static blobs and do not require Supabase for normal browsing.
- PASS: instructor pages decrypt the needed static blobs and do not require Supabase for normal browsing.
- PASS: `/api/search` still returns expected results if the compatibility API is exercised.
- PASS: course-code API searches use indexed prefix/number lookup.
- PASS: tests and TypeScript pass.
- PASS: PR checks are reviewed before merge.

## 7. Branch, PR, and review expectations

Performance changes should use the same workflow as other changes:

1. Create a non-`main` branch, usually `perf/...`.
2. Make focused commits.
3. Push the branch and open a PR into `main`.
4. Include measured validation results or explain why measurement was not possible.
5. Review automated checks and Vercel output before merge.
6. Fix any failures on the same branch and re-review checks.
