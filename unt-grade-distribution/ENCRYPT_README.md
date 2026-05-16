Encrypted static-data workflow
=============================

Overview
--------
This project supports a static, encrypted data workflow: CSVs are processed at build-time into many small encrypted blobs and a small manifest. The app fetches only the blobs it needs and decrypts them in the browser with a passphrase.

How to prepare encrypted data (offline)
--------------------------------------
1. Place your CSV files into `prisma/data/` (same format used by the existing `prisma/seed.ts`).
2. Run the encryptor locally (you must provide a passphrase):

```bash
cd unt-grade-distribution
npm install # ensure csv-parse is available
MASTER_PASSPHRASE="your-strong-passphrase" node ./tools/encrypt-data.js
```

3. The script writes `public/encrypted/manifest.json` and `public/encrypted/blobs/*.bin` and `*.meta.json`.
4. Commit only the resulting `public/encrypted/` directory (it contains encrypted blobs). Do NOT commit plaintext CSVs.

CSV Format
----------
The encryptor expects CSV files with a header row. There are two ways to provide input:

Option A — single combined CSV (direct): place one or more CSVs in `prisma/data/` using the encryptor's target headers. Required columns (case-sensitive):

- `COURSE NAME` — string, e.g. `ACCT 2010 - PRINCIPLES OF ACCOUNTING` (split on ` - ` to get title)
- `SECTION NUMBER` — string, e.g. `001`, `A01`
- `TEACHER NAME` — string, preferably `Last,First` (comma separates last and first)
- `YEAR` — integer or string representing the academic year (e.g. `2023`)
- `TERM` — string representing the term/session (e.g. `Fall`, `Spring`, `Summer`)
- `A`, `B`, `C`, `D`, `F`, `P`, `NP`, `W`, `I` — numeric grade counts (missing treated as 0)

Option B — Supabase-style relational CSVs (converter): if you exported separate tables from Supabase, place these files in `prisma/data/`:

- `courses_rows.csv`  — header: `id,prefix,number,title`
- `instructors_rows.csv` — header: `id,first_name,last_name`
- `sections_rows.csv` — header: `id,course_id,section_number,instructor_id,year,term`
- `grades_rows.csv` — header: `section_id,grade_a,grade_b,grade_c,grade_d,grade_f,grade_p,grade_np,grade_w,grade_i`

Then run the converter script to produce a combined CSV the encryptor accepts:

```bash
npm run convert:supabase
```

Multiple CSVs may still be present; the encryptor reads `*.csv` in `prisma/data/` and merges rows by course (grouping sections under courses). `YEAR` and `TERM` are recorded per-section in the encrypted output.

Minimal example CSV (direct input)
```csv
COURSE NAME,SECTION NUMBER,TEACHER NAME,YEAR,TERM,A,B,C,D,F,P,NP,W,I
ACCT 2010 - PRINCIPLES OF ACCOUNTING,001,Smith,John,2023,Fall,25,30,10,0,0,0,0,0,0
ACCT 2010 - PRINCIPLES OF ACCOUNTING,002,Doe,Jane,2024,Spring,20,22,15,1,0,0,0,0,0
CS 311 - DATA STRUCTURES,001,Moore,Ami R,2025,Fall,15,18,10,2,1,0,0,0,0
```

Client usage
------------
- The browser fetches `/encrypted/manifest.json` and matches the user query to a blob id.
- The browser fetches `/encrypted/blobs/<id>.bin` and `/encrypted/blobs/<id>.meta.json`, derives a key from the passphrase and salt, decrypts AES-GCM ciphertext, and displays the JSON.

No prompt mode (automatic client key)
-------------------------------------
If you do not want users to type a passphrase, set this in `.env`:

```bash
NEXT_PUBLIC_DATA_KEY="same-value-as-MASTER_PASSPHRASE-used-for-encrypt"
```

This removes the unlock prompt UX and decrypts automatically in the browser. It is still client-side, so treat this as scrape-resistance (not strict secrecy).

Security notes
--------------
- Keep the passphrase secret and distribute it out-of-band to authorized users.
- This design prevents bulk plaintext leaks from the repo/CDN, but any user who obtains the passphrase (or who can scrape every blob and brute-force the passphrase) can decrypt data.
- To make scraping more expensive, increase `PBKDF2_ITERATIONS` (environment variable) when encrypting.

Next integration steps
----------------------
1. Replace server-side API routes that query Prisma with client-side lookups to the manifest + decrypt flow, or keep them for admin-only server usage.
2. Consider rotating passphrases by re-encrypting blobs and updating the manifest.
