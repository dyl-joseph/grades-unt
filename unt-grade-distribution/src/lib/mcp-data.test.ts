import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { webcrypto } from "node:crypto";
import test from "node:test";
import type { EncryptedCourse } from "./encryptedData";
import { createGradeDataSource } from "./mcp-data";

const dataKey = "fixture-grade-data-key";
const encoder = new TextEncoder();

const fixtureCourses = [
  {
    id: `${"a".repeat(32)}.bin`,
    tokens: ["CSCE 1030", "ADA PROGRAMMING", "Lovelace,Ada"],
    course: {
      prefix: "CSCE",
      number: "1030",
      title: "ADA PROGRAMMING",
      sections: [
        {
          sectionNumber: "001",
          instructor: { firstName: "Ada", lastName: "Lovelace" },
          year: "2025",
          term: "Fall",
          grades: { A: 3, B: 1, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
        {
          sectionNumber: "002",
          instructor: { firstName: "Ada", lastName: "Lovelace" },
          year: "2026",
          term: "Spring",
          grades: { A: 1, B: 3, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
        {
          sectionNumber: "003",
          instructor: { firstName: "Ada", lastName: "Lovelace" },
          year: "2025",
          term: "Summer",
          grades: { A: 0, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
      ],
    } satisfies EncryptedCourse,
  },
  {
    id: `${"b".repeat(32)}.bin`,
    tokens: ["MATH 2000", "ADA ALGORITHMS", "Lovelace,Ada"],
    course: {
      prefix: "MATH",
      number: "2000",
      title: "ADA ALGORITHMS",
      sections: [
        {
          sectionNumber: "001",
          instructor: { firstName: "Ada", lastName: "Lovelace" },
          year: "2024",
          term: "Fall",
          grades: { A: 2, B: 2, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
          spot: { rating: 4.6, cei: null, responses: 12, enrolled: 30 },
        },
      ],
    } satisfies EncryptedCourse,
  },
  {
    id: `${"c".repeat(32)}.bin`,
    tokens: ["PHYS 1410", "MECHANICS", "Curie,Marie"],
    course: {
      prefix: "PHYS",
      number: "1410",
      title: "MECHANICS",
      sections: [
        {
          sectionNumber: "001",
          instructor: { firstName: "Marie", lastName: "Curie" },
          year: "2026",
          term: "Summer",
          grades: { A: 1, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
        {
          sectionNumber: "002",
          instructor: { firstName: "Marie", lastName: "Curie" },
          year: "2026",
          term: "Winter",
          grades: { A: 1, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
        {
          sectionNumber: "003",
          instructor: { firstName: "Marie", lastName: "Curie" },
          year: "2026",
          term: "Fall",
          grades: { A: 1, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
        {
          sectionNumber: "004",
          instructor: { firstName: "Marie", lastName: "Curie" },
          year: "2026",
          term: "Maymester",
          grades: { A: 1, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
        {
          sectionNumber: "005",
          instructor: { firstName: "Marie", lastName: "Curie" },
          year: "2026",
          term: "Spring",
          grades: { A: 1, B: 0, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
      ],
    } satisfies EncryptedCourse,
  },
];

async function createFixture(key: string | undefined) {
  const directory = await mkdtemp(path.join(tmpdir(), "unt-mcp-data-"));
  const blobsDirectory = path.join(directory, "blobs");
  await mkdir(blobsDirectory);

  const manifest = fixtureCourses.map(({ id, tokens, course }) => ({
    id,
    tokens,
    preview: { prefix: course.prefix, number: course.number, title: course.title },
  }));
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));

  for (const { id, course } of fixtureCourses) {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const baseKey = await webcrypto.subtle.importKey(
      "raw",
      encoder.encode(dataKey),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const encryptionKey = await webcrypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 1, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    const encrypted = await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      encoder.encode(JSON.stringify(course))
    );

    await writeFile(path.join(blobsDirectory, id), Buffer.from(encrypted));
    await writeFile(
      path.join(blobsDirectory, id.replace(/\.bin$/, ".meta.json")),
      JSON.stringify({
        iv: Buffer.from(iv).toString("base64"),
        salt: Buffer.from(salt).toString("base64"),
        iterations: 1,
      })
    );
  }

  return {
    dataSource: createGradeDataSource(directory, () => key),
    close: () => rm(directory, { recursive: true, force: true }),
  };
}

test("search returns matching courses and instructors from the manifest", async () => {
  const fixture = await createFixture(dataKey);
  try {
    assert.deepEqual(await fixture.dataSource.search(" ADA "), {
      courses: [
        { prefix: "CSCE", number: "1030", title: "ADA PROGRAMMING", path: "/course/CSCE/1030" },
        { prefix: "MATH", number: "2000", title: "ADA ALGORITHMS", path: "/course/MATH/2000" },
      ],
      instructors: [
        { firstName: "Ada", lastName: "Lovelace", path: "/instructor/Lovelace%2CAda" },
      ],
    });
  } finally {
    await fixture.close();
  }
});

test("course reads keep SPOT ratings on the sections that have them", async () => {
  const fixture = await createFixture(dataKey);
  try {
    const rated = await fixture.dataSource.getCourse("MATH", "2000", 0, 5);
    assert.deepEqual(rated?.sections[0].spot, { rating: 4.6, cei: null, responses: 12, enrolled: 30 });

    const unrated = await fixture.dataSource.getCourse("CSCE", "1030", 0, 5);
    assert.equal(unrated?.sections.some((section) => "spot" in section), false);
  } finally {
    await fixture.close();
  }
});

test("course reads decrypt grade data, drop empty sections, and paginate", async () => {
  const fixture = await createFixture(dataKey);
  try {
    const firstPage = await fixture.dataSource.getCourse(" csce ", "1030", 0, 1);
    assert.deepEqual(firstPage, {
      prefix: "CSCE",
      number: "1030",
      title: "ADA PROGRAMMING",
      path: "/course/CSCE/1030",
      totalSections: 2,
      offset: 0,
      nextOffset: 1,
      totalGrades: 8,
      aggregateGrades: { A: 4, B: 4, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
      gpa: 3.5,
      sections: [
        {
          sectionNumber: "002",
          instructor: { firstName: "Ada", lastName: "Lovelace" },
          year: "2026",
          term: "Spring",
          grades: { A: 1, B: 3, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
        },
      ],
    });

    const secondPage = await fixture.dataSource.getCourse("CSCE", "1030", 1, 1);
    assert.equal(secondPage?.nextOffset, null);
    assert.deepEqual(secondPage?.sections, [
      {
        sectionNumber: "001",
        instructor: { firstName: "Ada", lastName: "Lovelace" },
        year: "2025",
        term: "Fall",
        grades: { A: 3, B: 1, C: 0, D: 0, F: 0, P: 0, NP: 0, W: 0, I: 0 },
      },
    ]);
  } finally {
    await fixture.close();
  }
});

test("course sections sort newest semester first within a year", async () => {
  const fixture = await createFixture(dataKey);
  try {
    const course = await fixture.dataSource.getCourse("PHYS", "1410", 0, 10);
    assert.deepEqual(
      course?.sections.map(({ term }) => term),
      ["Fall", "Summer", "Maymester", "Spring", "Winter"]
    );
  } finally {
    await fixture.close();
  }
});

test("instructor course results paginate in manifest order", async () => {
  const fixture = await createFixture(dataKey);
  try {
    assert.deepEqual(await fixture.dataSource.getInstructorCourses("Ada", "Lovelace", 0, 1), {
      firstName: "Ada",
      lastName: "Lovelace",
      totalCourses: 2,
      offset: 0,
      nextOffset: 1,
      courses: [
        { prefix: "CSCE", number: "1030", title: "ADA PROGRAMMING", path: "/course/CSCE/1030" },
      ],
    });
    assert.deepEqual(await fixture.dataSource.getInstructorCourses("Ada", "Lovelace", 1, 1), {
      firstName: "Ada",
      lastName: "Lovelace",
      totalCourses: 2,
      offset: 1,
      nextOffset: null,
      courses: [
        { prefix: "MATH", number: "2000", title: "ADA ALGORITHMS", path: "/course/MATH/2000" },
      ],
    });
  } finally {
    await fixture.close();
  }
});

test("course reads require NEXT_PUBLIC_DATA_KEY while manifest search remains available", async () => {
  const fixture = await createFixture(undefined);
  try {
    await assert.rejects(fixture.dataSource.getCourse("CSCE", "1030", 0, 1), {
      message: "NEXT_PUBLIC_DATA_KEY is required to read course grades",
    });
    assert.deepEqual((await fixture.dataSource.search("ada")).courses, [
      { prefix: "CSCE", number: "1030", title: "ADA PROGRAMMING", path: "/course/CSCE/1030" },
      { prefix: "MATH", number: "2000", title: "ADA ALGORITHMS", path: "/course/MATH/2000" },
    ]);
  } finally {
    await fixture.close();
  }
});
