import assert from "node:assert/strict";
import test from "node:test";
import {
  createManifestLoader,
  findInstructorEntries,
  fromInstructorSlug,
  loadCourseByCode,
  loadInstructorSections,
  searchManifest,
  type EncryptedCourse,
  type EncryptedSection,
  type ManifestEntry,
} from "./encryptedData";

const passphrase = "test-data-key";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function grades(overrides: Partial<EncryptedSection["grades"]> = {}) {
  return { A: 0, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0, ...overrides };
}

function section(
  sectionNumber: string,
  firstName: string,
  lastName: string,
  gradeOverrides: Partial<EncryptedSection["grades"]> = { A: 1 }
): EncryptedSection {
  return {
    sectionNumber,
    instructor: { firstName, lastName },
    year: "2025",
    term: "Fall",
    grades: grades(gradeOverrides),
  };
}

function course(prefix: string, number: string, title: string, sections: EncryptedSection[]): EncryptedCourse {
  return { prefix, number, title, sections };
}

async function encryptCourse(value: EncryptedCourse, key: string) {
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const iv = new Uint8Array([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
  const iterations = 1;
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "PBKDF2" }, false, ["deriveKey"]);
  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, derivedKey, encoder.encode(JSON.stringify(value)));

  return {
    encrypted,
    meta: {
      iv: Buffer.from(iv).toString("base64"),
      salt: Buffer.from(salt).toString("base64"),
      iterations,
    },
  };
}

test("manifest loader coalesces in-flight work and resets after failures", async () => {
  const manifest: ManifestEntry[] = [
    { id: "course.bin", tokens: ["CSCE 1010", "DATA STRUCTURES"], preview: { prefix: "CSCE", number: "1010", title: "DATA STRUCTURES" } },
  ];
  const pendingResponse = deferred<Response>();
  let requests = 0;
  const loadManifest = createManifestLoader(() => {
    requests += 1;
    return pendingResponse.promise;
  });

  const first = loadManifest();
  const second = loadManifest();
  assert.strictEqual(first, second);
  await Promise.resolve();
  assert.equal(requests, 1);

  pendingResponse.resolve(Response.json(manifest));
  assert.deepEqual(await first, manifest);
  assert.strictEqual(loadManifest(), first);
  assert.equal(requests, 1);

  const retryResponses = [
    new Response(null, { status: 503 }),
    new Response("{", { headers: { "Content-Type": "application/json" } }),
    Response.json(manifest),
  ];
  let retryRequests = 0;
  const retryManifest = createManifestLoader(() => {
    const response = retryResponses[retryRequests];
    retryRequests += 1;
    if (!response) throw new Error("unexpected manifest request");
    return Promise.resolve(response);
  });

  await assert.rejects(retryManifest(), { message: "Failed to load manifest" });
  await Promise.resolve();
  await assert.rejects(retryManifest());
  await Promise.resolve();
  assert.deepEqual(await retryManifest(), manifest);
  assert.equal(retryRequests, 3);
});

test("static search and instructor loading stay exact, bounded, and concurrent", async (t) => {
  const originalFetch = globalThis.fetch;
  const encryptedById = new Map<string, Awaited<ReturnType<typeof encryptCourse>>>();
  const blobRequests: string[] = [];
  const allRequests: string[] = [];
  const failedBlobs = new Set<string>();
  const deferredBlobs = new Map<string, ReturnType<typeof deferred<Response>>>();
  const deferredStarts: string[] = [];
  let manifestRequests = 0;

  const encryptedCourses = [
    {
      id: "math-1650.bin",
      value: course("MATH", "1650", "PRE-CALCULUS", [
        section("301", "Grace", "Hopper", grades()),
        section("001", "Ada", "Lovelace", { A: 10, B: 8, C: 4, D: 1, W: 2 }),
      ]),
      tokens: ["MATH 1650", "PRE-CALCULUS", "Hopper,Grace", "Lovelace,Ada"],
    },
    {
      id: "he-one.bin",
      value: course("MATH", "2700", "LINEAR ALGEBRA", [section("001", "Yanyan", "He"), section("002", "Ying", "He")]),
      tokens: ["MATH 2700", "LINEAR ALGEBRA", "He,Yanyan", "He,Ying"],
    },
    {
      id: "he-two.bin",
      value: course("MATH", "6950", "DISSERTATION", [section("001", "Yanyan", "He")]),
      tokens: ["MATH 6950", "DISSERTATION", "He,Yanyan"],
    },
    {
      id: "he-other.bin",
      value: course("ART", "1110", "DRAWING", [section("001", "Ying", "He")]),
      tokens: ["ART 1110", "DRAWING", "He,Ying"],
    },
    {
      id: "li.bin",
      value: course("ART", "1000", "FOUNDATIONS", [section("001", "Ann", "Li"), section("002", "Bob", "Li")]),
      tokens: ["ART 1000", "FOUNDATIONS", "Li,Ann", "Li,Bob"],
    },
    {
      id: "unicode.bin",
      value: course("LANG", "2000", "LANGUAGE", [section("001", "José-Luis", "García"), section("002", "Mae", "O'Connor")]),
      tokens: ["LANG 2000", "LANGUAGE", "García,José-Luis", "O'Connor,Mae"],
    },
    {
      id: "partial-good.bin",
      value: course("CSCE", "3000", "NETWORKS", [section("001", "Pat", "Partial")]),
      tokens: ["CSCE 3000", "NETWORKS", "Partial,Pat"],
    },
    {
      id: "partial-bad.bin",
      value: course("CSCE", "3001", "SYSTEMS", [section("001", "Pat", "Partial")]),
      tokens: ["CSCE 3001", "SYSTEMS", "Partial,Pat"],
    },
    {
      id: "concurrent-one.bin",
      value: course("CSCE", "4000", "CONCURRENCY", [section("001", "Case", "Concurrent")]),
      tokens: ["CSCE 4000", "CONCURRENCY", "Concurrent,Case"],
    },
    {
      id: "concurrent-two.bin",
      value: course("CSCE", "4001", "PARALLELISM", [section("001", "Case", "Concurrent")]),
      tokens: ["CSCE 4001", "PARALLELISM", "Concurrent,Case"],
    },
  ];

  for (const item of encryptedCourses) {
    encryptedById.set(item.id, await encryptCourse(item.value, passphrase));
  }

  const manifest: ManifestEntry[] = [
    ...encryptedCourses.map(({ id, value, tokens }) => ({
      id,
      tokens,
      preview: { prefix: value.prefix, number: value.number, title: value.title },
    })),
    {
      id: "csce-1010.bin",
      tokens: ["CSCE 1010", "Data, Structures", "Doe,Jane"],
      preview: { prefix: "CSCE", number: "1010", title: "Data, Structures" },
    },
    {
      id: "csce-1010-duplicate.bin",
      tokens: ["CSCE 1010", "Data, Structures", "Doe,Jane"],
      preview: { prefix: "CSCE", number: "1010", title: "Data, Structures" },
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      id: `math-${1000 + index}.bin`,
      tokens: [`MATH ${1000 + index}`, "TESTING"],
      preview: { prefix: "MATH", number: String(1000 + index), title: "TESTING" },
    })),
  ];

  globalThis.fetch = async (input) => {
    const url = String(input);
    allRequests.push(url);

    if (url === "/encrypted/manifest.json") {
      manifestRequests += 1;
      return Response.json(manifest);
    }

    const blobPrefix = "/encrypted/blobs/";
    if (!url.startsWith(blobPrefix)) return new Response(null, { status: 404 });

    const fileName = url.slice(blobPrefix.length);
    blobRequests.push(fileName);
    const blobId = fileName.endsWith(".meta.json") ? fileName.replace(/\.meta\.json$/, ".bin") : fileName;
    const encrypted = encryptedById.get(blobId);
    if (!encrypted) return new Response(null, { status: 404 });

    if (fileName.endsWith(".bin")) {
      if (failedBlobs.has(blobId)) return new Response(null, { status: 503 });

      const pending = deferredBlobs.get(blobId);
      if (pending) {
        deferredStarts.push(blobId);
        return pending.promise;
      }

      return new Response(encrypted.encrypted.slice(0));
    }

    return Response.json(encrypted.meta);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("search normalizes compact codes, titles, ranking, and result limits", async () => {
    assert.deepEqual(await searchManifest(" "), { courses: [], instructors: [] });
    assert.equal(manifestRequests, 0);

    const spaced = await searchManifest("  CSCE   1010  ");
    const compact = await searchManifest("csce1010");
    assert.equal(spaced.courses.filter((item) => item.prefix === "CSCE" && item.number === "1010").length, 1);
    assert.deepEqual(compact.courses, spaced.courses);

    const title = await searchManifest("data, structures");
    assert.equal(title.courses[0]?.title, "Data, Structures");
    assert.deepEqual(title.instructors, []);

    const instructor = await searchManifest("DOE, JANE");
    assert.deepEqual(instructor.instructors, [{ id: "Doe%2CJane", firstName: "Jane", lastName: "Doe" }]);

    const firstMathSearch = await searchManifest("math");
    const repeatedMathSearch = await searchManifest("math");
    assert.equal(firstMathSearch.courses.length, 8);
    assert.deepEqual(repeatedMathSearch, firstMathSearch);
    assert.equal(manifestRequests, 1);
  });

  await t.test("course reads stay static and filter empty sections", async () => {
    const loaded = await loadCourseByCode("MATH", "1650", passphrase);

    assert.equal(loaded?.sections.length, 1);
    assert.equal(loaded?.sections[0]?.instructor.lastName, "Lovelace");
    assert.ok(!allRequests.some((url) => url.startsWith("/api/course/")));
  });

  await t.test("instructor selection uses exact full tokens and exact section names", async () => {
    blobRequests.length = 0;
    const entries = findInstructorEntries(manifest, " YANYAN ", " he ");
    assert.deepEqual(entries.map((entry) => entry.id), ["he-one.bin", "he-two.bin"]);
    assert.ok(entries.every((entry) => entry.tokens.slice(2).includes("He,Yanyan")));

    const sections = await loadInstructorSections(" YANYAN ", " he ", passphrase);
    assert.deepEqual(sections.map((item) => `${item.course.prefix} ${item.course.number}:${item.instructor.firstName}`), [
      "MATH 2700:Yanyan",
      "MATH 6950:Yanyan",
    ]);
    assert.deepEqual(blobRequests.sort(), ["he-one.bin", "he-one.meta.json", "he-two.bin", "he-two.meta.json"].sort());
  });

  await t.test("malformed slugs and no matches fetch no blobs", async () => {
    blobRequests.length = 0;
    assert.deepEqual(fromInstructorSlug("He%2CYanyan"), { firstName: "Yanyan", lastName: "He" });
    assert.deepEqual(fromInstructorSlug("not-an-instructor"), { firstName: "", lastName: "" });
    assert.deepEqual(fromInstructorSlug("%E0%A4%A"), { firstName: "", lastName: "" });
    assert.deepEqual(await loadInstructorSections("", "He", passphrase), []);
    assert.deepEqual(await loadInstructorSections("Yanyan", "Unknown", passphrase), []);
    assert.deepEqual(blobRequests, []);
  });

  await t.test("short surnames, punctuation, and Unicode require exact normalized names", async () => {
    blobRequests.length = 0;
    const li = await loadInstructorSections(" ann ", " LI ", passphrase);
    const unicode = await loadInstructorSections(" josé-luis ", " GARCÍA ", passphrase);
    const punctuation = await loadInstructorSections("MAE", "o'connor", passphrase);

    assert.deepEqual(li.map((item) => item.instructor.firstName), ["Ann"]);
    assert.deepEqual(unicode.map((item) => item.instructor.lastName), ["García"]);
    assert.deepEqual(punctuation.map((item) => item.instructor.lastName), ["O'Connor"]);
    assert.deepEqual(blobRequests.sort(), ["li.bin", "li.meta.json", "unicode.bin", "unicode.meta.json", "unicode.bin", "unicode.meta.json"].sort());
  });

  await t.test("partial blob failures keep successfully decrypted instructor sections", async () => {
    blobRequests.length = 0;
    failedBlobs.add("partial-bad.bin");
    const sections = await loadInstructorSections("Pat", "Partial", passphrase);
    failedBlobs.clear();

    assert.deepEqual(sections.map((item) => item.course.number), ["3000"]);
    assert.deepEqual(blobRequests.sort(), [
      "partial-good.bin",
      "partial-good.meta.json",
      "partial-bad.bin",
      "partial-bad.meta.json",
    ].sort());
  });

  await t.test("matching blobs begin decrypting concurrently and retain manifest order", async () => {
    blobRequests.length = 0;
    const first = deferred<Response>();
    const second = deferred<Response>();
    deferredBlobs.set("concurrent-one.bin", first);
    deferredBlobs.set("concurrent-two.bin", second);

    const loading = loadInstructorSections("Case", "Concurrent", passphrase);
    await Promise.resolve();

    try {
      assert.deepEqual(deferredStarts.sort(), ["concurrent-one.bin", "concurrent-two.bin"]);
    } finally {
      first.resolve(new Response(encryptedById.get("concurrent-one.bin")?.encrypted.slice(0)));
      second.resolve(new Response(encryptedById.get("concurrent-two.bin")?.encrypted.slice(0)));
      deferredBlobs.clear();
    }

    const sections = await loading;
    assert.deepEqual(sections.map((item) => item.course.number), ["4000", "4001"]);
  });
});
