# grades-unt

## Choosing classes is a gamble. It shouldn't be.

You do not always know what you are signing up for until it is too late. `grades-unt` makes UNT grade distributions easier to browse by course and instructor.

**Live site:** [untgrades.app](https://untgrades.app)

## What the app uses today

The public website reads from **encrypted static data stored with the deployed site**, not live Postgres queries.

- Course and instructor data is generated from CSV exports during the data-prep workflow.
- The generated files live under `unt-grade-distribution/public/encrypted/`.
- The browser downloads `manifest.json` and only the encrypted blob needed for the selected course or instructor.
- Client-side WebCrypto decrypts the blob with `NEXT_PUBLIC_DATA_KEY`.
- Prisma/Postgres still exists for import, validation, migrations, and backend/API compatibility work, but it is not the primary user-facing read path.

## Technical implementation

### Frontend

- React 19.2.3
- Next.js 16.1.6 App Router
- TypeScript
- Tailwind CSS v4
- Recharts 3.7.0 for grade distribution charts
- jsPDF + jspdf-autotable for PDF export
- Vercel Analytics + Vercel Speed Insights for real-user monitoring

### Data delivery

- Static encrypted blobs generated at build/data-prep time from CSV exports
- Manifest-driven search in the browser
- Client-side WebCrypto decryption for course and instructor pages
- CDN-backed reads through Vercel static assets
- No Prisma/Postgres runtime dependency for normal website browsing

### Backend and database

- Prisma 7.4.2 with PostgreSQL/Postgres remains in the repo for seeding, migrations, validation, and backend API routes.
- Backend API routes use explicit Prisma `select` clauses and indexes for faster query paths when those routes are used.
- `DATABASE_URL` should point at the pooled Postgres in production-like serverless environments.
- `DIRECT_URL` should point at the direct Postgres host for local development and bulk operations.

## Repository layout

```text
.
├── README.md
├── DOCUMENTATION.md
└── unt-grade-distribution/
    ├── README.md
    ├── DOCUMENTATION.md
    ├── ENCRYPT_README.md
    ├── PERF_VALIDATION_RUNBOOK.md
    ├── prisma/
    ├── public/encrypted/
    ├── src/
    └── tools/
```

The Next.js app lives in `unt-grade-distribution/`. Root-level docs provide repo-wide context; app-level docs provide implementation details.

## Development workflow

Keep the existing branch/PR/review model:

1. Start from an up-to-date `main`.
2. Create a separate branch for each change, for example `feat/...`, `fix/...`, `perf/...`, or `docs/...`.
3. Commit with a conventional message.
4. Push the branch and open a PR into `main`.
5. Wait for automated checks and review before merging.
6. Do not push directly to `main` unless the maintainers intentionally choose to bypass the normal review path.

## Useful commands

```bash
cd unt-grade-distribution
npm install
npm test
npx tsc --noEmit
DATABASE_URL="postgresql://user:***@host:5432/db" DIRECT_URL="postgresql://user:***@host:5432/db" npm run build
```

## Maintainers

- [Dylan Joseph](https://github.com/dyl-joseph)
- [Gautham Nair](https://github.com/GauthamRNair)
- [Akhil Tumati](https://github.com/YouSoMoose)

## Initial contributors

- [Sai Are](https://github.com/FrostNinja397)

## Planned features

- **SPOT Evaluations** — integrate Student Perceptions of Teaching data for instructors.
- **More historical coverage** — expand beyond the currently imported semesters as additional source exports become available.
- **Smarter client aggregates** — keep compare-page aggregation fast by precomputing or indexing more summary data in the encrypted manifest layer without reintroducing a live database dependency for public reads.
