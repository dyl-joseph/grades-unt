# UNT Grade Explorer — Technical Documentation

> A Next.js application for exploring University of North Texas grade distributions by course and instructor.

**Live URL:** [untgrades.app](https://untgrades.app)
**Repository:** [github.com/dyl-joseph/grades-unt](https://github.com/dyl-joseph/grades-unt)

## Table of contents

1. [Current architecture](#1-current-architecture)
2. [Tech stack](#2-tech-stack)
3. [Project structure](#3-project-structure)
4. [Data delivery](#4-data-delivery)
5. [Database and backend routes](#5-database-and-backend-routes)
6. [Search](#6-search)
7. [Pages and components](#7-pages-and-components)
8. [Environment variables](#8-environment-variables)
9. [Development workflow](#9-development-workflow)
10. [Deployment and review process](#10-deployment-and-review-process)

---

## 1. Current architecture

The public website is optimized around **static encrypted data** instead of live database reads.

```text
Browser
  ├─ SearchBar / compare UI
  │    └─ fetches /encrypted/manifest.json
  ├─ Course page
  │    └─ fetches /encrypted/blobs/<course>.bin + metadata
  ├─ Instructor page
  │    └─ finds related manifest entries, then fetches matching blobs
  └─ WebCrypto decrypts selected payloads locally

Vercel / CDN
  └─ serves Next.js app and public/encrypted static assets

Prisma / Postgres
  ├─ used for imports, migrations, data validation, and backend API compatibility
  └─ not the normal public read path for course/instructor browsing
```

Important distinction: the public site should continue reading encrypted static assets stored with the website. Postgres is still useful for preparing and validating data, but public browsing should not depend on a live database connection.

---

## 2. Tech stack

| Area | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16.1.6 | App Router, API routes, build/deploy target |
| UI | React 19.2.3 | Client components and interactive views |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS v4 | Utility styling and dark-mode variants |
| Charts | Recharts 3.7.0 | Grade distribution charts |
| PDFs | jsPDF + jspdf-autotable | Client-side export |
| Analytics | Vercel Analytics | Page views and Web Vitals |
| Performance | Vercel Speed Insights | Real-user route timing |
| Database tooling | Prisma 7.4.2 + pg | Postgres access for tooling and backend routes |
| CSV tooling | csv-parse | Import/encryption workflows |

---

## 3. Project structure

```text
unt-grade-distribution/
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   └── encrypted/
│       ├── manifest.json
│       └── blobs/
├── src/
│   ├── app/
│   │   ├── api/course/[prefix]/[number]/route.ts
│   │   ├── api/instructor/[id]/route.ts
│   │   ├── api/search/route.ts
│   │   ├── cart/page.tsx
│   │   ├── compare/page.tsx
│   │   ├── course/[prefix]/[number]/page.tsx
│   │   ├── instructor/[id]/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── context/
│   ├── hooks/
│   └── lib/
│       ├── encryptedData.ts
│       ├── grades.ts
│       ├── prisma.ts
│       ├── search.ts
│       └── types.ts
└── tools/
    ├── convert-relational-to-encrypt-csv.js
    └── encrypt-data.js
```

---

## 4. Data delivery

### Encrypted static files

The encrypted-data workflow generates assets under `public/encrypted/`:

- `manifest.json` — searchable metadata, preview course fields, instructor tokens, and blob IDs.
- `blobs/*.bin` — encrypted JSON course payloads.
- `blobs/*.meta.json` — salt, IV, and iteration metadata needed for decryption.

At runtime:

1. The browser loads the manifest.
2. Search filters manifest entries locally.
3. Course pages call `loadCourseByCode(prefix, number)`.
4. Instructor pages call `loadInstructorSections(firstName, lastName)`.
5. `decryptBlob()` uses WebCrypto/PBKDF2/AES-GCM to decrypt the selected payload.

### Why this path matters

- Public reads are served by Vercel/CDN instead of Postgres.
- Search and navigation avoid database cold starts, connection limits, and query spikes.
- The encrypted blobs prevent plaintext grade data from being committed or served directly.
- Anyone with the client data key can decrypt the data, so this is scrape resistance and access friction, not a substitute for server-side authorization.

---

## 5. Database and backend routes

The database schema remains useful for import/validation and backend compatibility.

### Prisma models

- `Course`: `id`, `prefix`, `number`, `title`
- `Instructor`: `id`, `firstName`, `lastName`
- `Section`: `id`, `sectionNumber`, `courseId`, `instructorId`, grade counts, `totalEnroll`

### Important indexes

- Unique course lookup: `(prefix, number)`
- Trigram search indexes for course titles and instructor names
- Section lookup indexes for course and instructor relationships
- Pattern/composite indexes for faster backend API query paths when the DB-backed routes are used

### Backend route expectations

The repo still contains DB-backed API routes:

- `/api/search`
- `/api/course/[prefix]/[number]`
- `/api/instructor/[id]`

These routes should remain efficient and tested, but they should not be confused with the primary public encrypted-data flow. When editing them:

- Prefer explicit Prisma `select` over broad `include`.
- Keep course-code searches on indexed `prefix`/`number` paths.
- Avoid unnecessary parallel DB queries on every keystroke.
- Validate changes with tests and TypeScript.

---

## 6. Search

The current public search experience is manifest-driven:

- `SearchBar` uses `searchManifest()` from `src/lib/encryptedData.ts`.
- Results are derived from static manifest metadata.
- Course-like queries are matched against course codes and titles.
- Instructor-like queries are matched against instructor tokens.

The DB-backed `/api/search` route remains in the codebase for compatibility and performance work. It includes server timing and cache headers, and its query plan should stay optimized for cases where that endpoint is used.

---

## 7. Pages and components

### Core pages

- `/` — home/search entry point
- `/course/[prefix]/[number]` — encrypted course lookup and section rendering
- `/instructor/[id]` — encrypted instructor lookup and grouped sections
- `/compare` — compare selected courses/instructors
- `/cart` — saved courses and export workflow

### Important components/utilities

- `SearchBar.tsx` — autocomplete UI and keyboard navigation
- `SectionCard.tsx` — per-section display and chart wrapper
- `GradeChart.tsx` / `LazyChart.tsx` — chart rendering and lazy loading
- `GpaBadge.tsx` — GPA display
- `CourseSaveButton.tsx` / saved-course context — local saved courses
- `grades.ts` — GPA, chart data, and aggregate helpers
- `encryptedData.ts` — manifest search and blob decryption

---

## 8. Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_DATA_KEY` | Client-visible passphrase used to decrypt static encrypted blobs automatically. Must match the encryption passphrase. |
| `MASTER_PASSPHRASE` | Local/offline passphrase used by `tools/encrypt-data.js` when generating encrypted blobs. Do not commit it. |
| `PBKDF2_ITERATIONS` | Optional encryption cost tuning for generated blobs. |
| `DATABASE_URL` | Production/serverless Prisma connection string, usually the pooled Postgres. |
| `DIRECT_URL` | Direct Postgres connection for local development and bulk operations. |

Never commit `.env` files or plaintext CSVs containing raw data.

---

## 9. Development workflow

```bash
cd unt-grade-distribution
npm install
npm run dev
npm test
npx tsc --noEmit
DATABASE_URL="postgresql://user:***@localhost:5432/db" DIRECT_URL="postgresql://user:***@localhost:5432/db" npm run build
```

For encrypted-data generation, see `ENCRYPT_README.md`.

If `npm run lint` reports unrelated existing lint debt, include that honestly in the PR notes rather than claiming lint is green.

---

## 10. Deployment and review process

Keep the existing GitHub workflow:

1. Branch from current `main`.
2. Use focused branches such as `docs/...`, `perf/...`, `fix/...`, or `feat/...`.
3. Commit with conventional commit messages.
4. Push the branch to GitHub.
5. Open a PR targeting `main`.
6. Review code and automated checks before merge.
7. Fix failing checks on the same branch and let CI rerun.
8. Merge only after the PR is ready and reviewed.

Vercel deploys from `main`; PRs may also get preview checks/comments depending on repository settings.
