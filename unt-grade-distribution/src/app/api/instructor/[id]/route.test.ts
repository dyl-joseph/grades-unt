import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

// lib/prisma reuses globalThis.prisma outside production; inject a fake before any import.
const findUnique = { calls: 0 };
Object.assign(globalThis, {
  prisma: { instructor: { findUnique: async () => { findUnique.calls += 1; return null; } } },
});

test("instructor route rejects non-integer ids before querying the database", async () => {
  const { GET } = await import("./route");

  for (const id of ["", "1.5", "1e3", "Infinity", "-1", "0", "0x10", "2147483648", "9007199254740993"]) {
    const response = await GET(
      new NextRequest(`https://example.test/api/instructor/${encodeURIComponent(id)}`),
      { params: Promise.resolve({ id }) }
    );
    assert.equal(response.status, 400, `id ${JSON.stringify(id)}`);
  }
  assert.equal(findUnique.calls, 0);

  const response = await GET(
    new NextRequest("https://example.test/api/instructor/2147483647"),
    { params: Promise.resolve({ id: "2147483647" }) }
  );
  assert.equal(response.status, 404);
  assert.equal(findUnique.calls, 1);
});
