# UNT Grade Distribution

Next.js app for browsing UNT grade distributions by course and instructor.

## Data model at runtime

The public app uses encrypted static files served from `public/encrypted/`:

- `manifest.json` contains searchable course/instructor metadata and blob IDs.
- `blobs/*.bin` contains AES-GCM encrypted course payloads.
- `blobs/*.meta.json` contains the IV, salt, and PBKDF2 settings for each blob.
- `src/lib/encryptedData.ts` loads the manifest, fetches the selected blob, derives a key with WebCrypto, decrypts the payload, and returns typed course/section data.

Supabase/Prisma is still supported for data import, migrations, validation, and backend/API compatibility routes, but normal user-facing course and instructor page reads should stay on the encrypted static-data path.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the encrypted blobs were generated with a data key, set the matching public key in `.env` for local development:

```bash
NEXT_PUBLIC_DATA_KEY="same-value-used-for-encryption"
```

## Validation commands

```bash
npm test
npx tsc --noEmit
DATABASE_URL="postgresql://user:***@localhost:5432/db" DIRECT_URL="postgresql://user:***@localhost:5432/db" npm run build
```

`npm run lint` may report existing lint debt unrelated to a focused change; do not hide that result in PR notes.

## Contribution workflow

Use branches, PRs, checks, and review:

1. Branch from `main`.
2. Make and test the change locally.
3. Commit with a conventional commit message.
4. Push the branch.
5. Open a PR into `main`.
6. Review CI/Vercel checks and address failures before merge.
