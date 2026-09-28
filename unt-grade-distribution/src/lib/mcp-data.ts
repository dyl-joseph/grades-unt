import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  findInstructorEntries,
  searchManifestEntries,
  sectionHasGrades,
} from "./encryptedData";
import { aggregateGrades, calculateGPA, toGradeData } from "./grades";
import { compareSemesterLabels, semesterLabel } from "./semester";

const manifestSchema = z.array(z.object({
  id: z.string().regex(/^[0-9a-f]{32}\.bin$/),
  tokens: z.array(z.string()),
  preview: z.object({ prefix: z.string(), number: z.string(), title: z.string() }),
}));

const gradeCount = z.number().int().nonnegative();
const gradesSchema = z.object({
  A: gradeCount, B: gradeCount, C: gradeCount, D: gradeCount, F: gradeCount,
  P: gradeCount, NP: gradeCount, W: gradeCount, I: gradeCount,
});
const courseSchema = z.object({
  prefix: z.string(),
  number: z.string(),
  title: z.string(),
  sections: z.array(z.object({
    sectionNumber: z.string(),
    instructor: z.object({ firstName: z.string(), lastName: z.string() }),
    year: z.string().nullable(),
    term: z.string().nullable(),
    grades: gradesSchema,
  })),
});
const blobMetaSchema = z.object({
  iv: z.string(),
  salt: z.string(),
  iterations: z.number().int().positive(),
});

function coursePath(prefix: string, number: string) {
  return `/course/${encodeURIComponent(prefix)}/${encodeURIComponent(number)}`;
}

export function createGradeDataSource(directory: string, dataKey: () => string | undefined) {
  let manifestPromise: Promise<z.infer<typeof manifestSchema>> | undefined;

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = readFile(path.join(directory, "manifest.json"), "utf8")
        .then((text) => manifestSchema.parse(JSON.parse(text)))
        .catch((error: unknown) => {
          manifestPromise = undefined;
          throw error;
        });
    }
    return manifestPromise;
  }

  async function readCourse(id: string) {
    const passphrase = dataKey()?.trim();
    if (!passphrase) throw new Error("NEXT_PUBLIC_DATA_KEY is required to read course grades");

    const [ciphertext, metaText] = await Promise.all([
      readFile(path.join(directory, "blobs", id)),
      readFile(path.join(directory, "blobs", id.replace(/\.bin$/, ".meta.json")), "utf8"),
    ]);
    const meta = blobMetaSchema.parse(JSON.parse(metaText));
    const baseKey = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: Uint8Array.from(Buffer.from(meta.salt, "base64")), iterations: meta.iterations, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Uint8Array.from(Buffer.from(meta.iv, "base64")) },
      key,
      Uint8Array.from(ciphertext)
    );
    return courseSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
  }

  return {
    async search(query: string) {
      const matches = searchManifestEntries(await loadManifest(), query);
      return {
        courses: matches.courses.map(({ prefix, number, title }) => ({
          prefix, number, title, path: coursePath(prefix, number),
        })),
        instructors: matches.instructors.map(({ firstName, lastName, id }) => ({
          firstName, lastName, path: `/instructor/${id}`,
        })),
      };
    },

    async getCourse(prefix: string, number: string, offset: number, limit: number) {
      const manifest = await loadManifest();
      const entry = manifest.find(({ preview }) =>
        preview.prefix.toLowerCase() === prefix.trim().toLowerCase() &&
        preview.number.toLowerCase() === number.trim().toLowerCase()
      );
      if (!entry) return null;

      const course = await readCourse(entry.id);
      const sections = course.sections
        .filter(sectionHasGrades)
        .sort((a, b) => compareSemesterLabels(semesterLabel(a), semesterLabel(b)));
      const totals = aggregateGrades(sections.map(({ grades }) => toGradeData(grades)));
      const page = sections.slice(offset, offset + limit);
      return {
        prefix: course.prefix,
        number: course.number,
        title: course.title,
        path: coursePath(course.prefix, course.number),
        totalSections: sections.length,
        offset,
        nextOffset: offset + limit < sections.length ? offset + limit : null,
        totalGrades: totals.totalEnroll,
        aggregateGrades: {
          A: totals.gradeA, B: totals.gradeB, C: totals.gradeC, D: totals.gradeD,
          F: totals.gradeF, P: totals.gradeP, NP: totals.gradeNP, W: totals.gradeW,
          I: totals.gradeI,
        },
        gpa: calculateGPA(totals),
        sections: page,
      };
    },

    async getInstructorCourses(firstName: string, lastName: string, offset: number, limit: number) {
      const entries = findInstructorEntries(await loadManifest(), firstName, lastName);
      return {
        firstName,
        lastName,
        totalCourses: entries.length,
        offset,
        nextOffset: offset + limit < entries.length ? offset + limit : null,
        courses: entries.slice(offset, offset + limit).map(({ preview }) => ({
          ...preview,
          path: coursePath(preview.prefix, preview.number),
        })),
      };
    },
  };
}

export const gradeData = createGradeDataSource(
  path.join(process.cwd(), "public", "encrypted"),
  () => process.env.NEXT_PUBLIC_DATA_KEY
);
