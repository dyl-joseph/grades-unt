import assert from "node:assert/strict";
import test from "node:test";
import { loadCourseByCode } from "./encryptedData";

const DATA_KEY_ERROR = "Course data key is missing or invalid for this deployment";

async function encryptCourse(course: unknown, passphrase: string) {
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const iv = new Uint8Array([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
  const iterations = 1;
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), { name: "PBKDF2" }, false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(course)));

  return {
    encrypted,
    meta: {
      iv: Buffer.from(iv).toString("base64"),
      salt: Buffer.from(salt).toString("base64"),
      iterations,
    },
  };
}

test("loadCourseByCode decrypts static course data and never falls back to the course API", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NEXT_PUBLIC_DATA_KEY;
  const passphrase = "test-data-key";
  const course = {
    prefix: "MATH",
    number: "1650",
    title: "PRE-CALCULUS",
    sections: [
      {
        sectionNumber: "301",
        instructor: { firstName: "Grace", lastName: "Hopper" },
        year: "2025",
        term: "Fall",
        grades: { A: 0, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
      },
      {
        sectionNumber: "001",
        instructor: { firstName: "Ada", lastName: "Lovelace" },
        year: "2025",
        term: "Fall",
        grades: { A: 10, B: 8, C: 4, D: 1, F: 0, P: 0, NP: 0, W: 2, I: 0 },
      },
    ],
  };
  const blobId = "math-1650.bin";
  let { encrypted, meta } = await encryptCourse(course, passphrase);
  const calls: string[] = [];
  let missingBlob = false;

  process.env.NEXT_PUBLIC_DATA_KEY = passphrase;
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url === "/encrypted/manifest.json") {
      return Response.json([{ id: blobId, tokens: ["MATH 1650"], preview: { prefix: "MATH", number: "1650", title: "PRE-CALCULUS" } }]);
    }

    if (url === `/encrypted/blobs/${blobId}` && !missingBlob) {
      return new Response(encrypted);
    }

    if (url === "/encrypted/blobs/math-1650.meta.json") {
      return Response.json(meta);
    }

    return new Response(null, { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_DATA_KEY;
    } else {
      process.env.NEXT_PUBLIC_DATA_KEY = originalKey;
    }
  });

  const loaded = await loadCourseByCode("MATH", "1650");

  assert.deepEqual(loaded, { ...course, sections: [course.sections[1]] });
  assert.ok(!calls.some((url) => url.startsWith("/api/course/")));

  const emptyCourse = { ...course, sections: [course.sections[0]] };
  ({ encrypted, meta } = await encryptCourse(emptyCourse, passphrase));
  assert.equal(await loadCourseByCode("MATH", "1650"), null);

  delete process.env.NEXT_PUBLIC_DATA_KEY;
  await assert.rejects(() => loadCourseByCode("MATH", "1650"), {
    message: DATA_KEY_ERROR,
  });
  assert.ok(!calls.some((url) => url.startsWith("/api/course/")));

  process.env.NEXT_PUBLIC_DATA_KEY = passphrase;
  missingBlob = true;
  await assert.rejects(() => loadCourseByCode("MATH", "1650"), {
    message: "Failed to fetch blob or metadata",
  });
  assert.ok(!calls.some((url) => url.startsWith("/api/course/")));
});
