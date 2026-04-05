import assert from "node:assert/strict";
import test from "node:test";
import { normalizePostgresConnectionString } from "./prisma-connection";

test("normalizePostgresConnectionString strips sslmode but preserves pooler settings", () => {
  const input =
    "postgresql://postgres.example:secret@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=prefer";

  assert.equal(
    normalizePostgresConnectionString(input),
    "postgresql://postgres.example:secret@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
  );
});

test("normalizePostgresConnectionString leaves URLs without sslmode unchanged", () => {
  const input = "postgresql://postgres.example:secret@db.example.supabase.co:5432/postgres";

  assert.equal(normalizePostgresConnectionString(input), input);
});
