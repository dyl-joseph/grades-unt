# Encrypted static-data workflow

## Overview

The public UNT Grades website uses a static encrypted data workflow. CSV exports are processed offline into many small encrypted course blobs plus a manifest. The deployed app fetches only the manifest and the blobs it needs, then decrypts them in the browser.

This means normal user-facing course and instructor reads come from files stored with the website under `public/encrypted/`, not live Postgres queries.

## Prepare encrypted data

1. Put source CSV files in `prisma/data/`.
2. Use the same CSV shape as `prisma/seed.ts`, or convert relational table exports first.
3. Run the encryptor with a passphrase:

```bash
cd unt-grade-distribution
npm install
MASTER_PASSPHRASE="your-strong-passphrase" node ./tools/encrypt-data.js
```

4. Commit the generated `public/encrypted/` files.
5. Do **not** commit plaintext CSV files or passphrases.

Generated files:

```text
public/encrypted/
├── manifest.json
└── blobs/
    ├── <id>.bin
    └── <id>.meta.json
```

## CSV format

### Option A: direct combined CSV

Required headers:

- `COURSE NAME` — for example `ACCT 2010 - PRINCIPLES OF ACCOUNTING`
- `SECTION NUMBER` — for example `001` or `A01`
- `TEACHER NAME` — preferably `Last,First`
- `YEAR`
- `TERM`
- `A`, `B`, `C`, `D`, `F`, `P`, `NP`, `W`, `I`

Example:

```csv
COURSE NAME,SECTION NUMBER,TEACHER NAME,YEAR,TERM,A,B,C,D,F,P,NP,W,I
ACCT 2010 - PRINCIPLES OF ACCOUNTING,001,"Smith,John",2023,Fall,25,30,10,0,0,0,0,0,0
ACCT 2010 - PRINCIPLES OF ACCOUNTING,002,"Doe,Jane",2024,Spring,20,22,15,1,0,0,0,0,0
CS 311 - DATA STRUCTURES,001,"Moore,Ami R",2025,Fall,15,18,10,2,1,0,0,0,0
```

### Option B: relational relational exports

If you export separate tables from Postgres, place these in `prisma/data/`:

- `courses_rows.csv` — `id,prefix,number,title`
- `instructors_rows.csv` — `id,first_name,last_name`
- `sections_rows.csv` — `id,course_id,section_number,instructor_id,year,term`
- `grades_rows.csv` — `section_id,grade_a,grade_b,grade_c,grade_d,grade_f,grade_p,grade_np,grade_w,grade_i`

Then convert them:

```bash
npm run convert:relational
```

After conversion, run the encryptor.

### Option C: long-form grade export

If the source file has one row per grade bucket with columns like `Semester/Term`, `Subject`, `Catalog Number`, `Class Section`, `Title`, `Grade`, `Grade Count`, and `Instructor`, pivot it into the encryptor CSV format first:

```bash
npm run pivot:grades -- \
  --sheet-url "https://docs.google.com/spreadsheets/d/<spreadsheet-id>/edit" \
  --out prisma/data/grades.csv \
  --semester-label test_semester \
  --split-by-term prisma/data/by-term
```

Use `--input path/to/export.csv` instead of `--sheet-url` when you already downloaded the sheet as CSV. The script writes the combined UNT Grades CSV and, when `--split-by-term` is provided, individual per-term CSV tables.

## Client usage

- `fetchManifest()` loads `/encrypted/manifest.json`.
- `searchManifest(q)` searches the manifest locally.
- `loadCourseByCode(prefix, number)` finds and decrypts one course blob.
- `loadInstructorSections(firstName, lastName)` finds matching course blobs and returns sections taught by that instructor.
- `decryptBlob(blobId)` fetches `.bin` and `.meta.json`, derives a key with PBKDF2, and decrypts AES-GCM ciphertext.

## Automatic client key

Set this in `.env` when the app should decrypt without asking the user for a passphrase:

```bash
NEXT_PUBLIC_DATA_KEY="same-value-as-MASTER_PASSPHRASE-used-for-encrypt"
```

Because this key is public to the browser, treat the design as scrape resistance, not strict secrecy.

## Security notes

- Keep `MASTER_PASSPHRASE` out of git.
- Do not commit plaintext CSV exports.
- Rotate by re-running encryption with a new passphrase and replacing `public/encrypted/`.
- Increasing `PBKDF2_ITERATIONS` makes brute force and mass scraping more expensive, but also increases browser decrypt cost.

## Contribution workflow for data updates

Use the same branch/PR/review process as code changes:

1. Branch from `main`.
2. Generate or update encrypted blobs locally.
3. Run tests/build validation.
4. Commit generated encrypted assets and any code changes.
5. Open a PR into `main`.
6. Wait for checks and review before merge.
