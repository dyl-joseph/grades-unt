import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import {
  findInstructorEntries,
  fromInstructorSlug,
  listInstructors,
  toInstructorSlug,
  type ManifestEntry,
} from "./encryptedData";

// Server-only helpers for page metadata and the sitemap. Canonical URLs always
// use the www host, whichever host served the request.
export const SITE_URL = "https://www.untgrades.app";
export const SITE_NAME = "UNT Grades";

export const HOME_TITLE = "UNT Grades: Grade Distributions by Course and Professor";
export const HOME_DESCRIPTION =
  "Explore grade distributions for every course and professor at the University of North Texas. Search by course code or professor name.";

type PageMetadataInput = {
  title: string;
  description: string;
  /** Site-relative path without query string or trailing slash, e.g. "/terms". */
  path: string;
  noindex?: boolean;
};

export function pageMetadata({ title, description, path: pagePath, noindex }: PageMetadataInput): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: pagePath },
    openGraph: {
      title,
      description,
      url: pagePath,
      type: "website",
      siteName: SITE_NAME,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function coursePath(prefix: string, number: string) {
  return `/course/${encodeURIComponent(prefix)}/${encodeURIComponent(number)}`;
}

export function instructorPath(firstName: string, lastName: string) {
  return `/instructor/${toInstructorSlug(firstName, lastName)}`;
}

// The same manifest the client fetches from /encrypted/manifest.json. Only the
// unencrypted preview fields (course code, title, instructor names) are used.
let manifestPromise: Promise<ManifestEntry[]> | undefined;

export function readManifest() {
  if (!manifestPromise) {
    manifestPromise = readFile(path.join(process.cwd(), "public", "encrypted", "manifest.json"), "utf8")
      .then((text) => JSON.parse(text) as ManifestEntry[])
      .catch((error: unknown) => {
        manifestPromise = undefined;
        throw error;
      });
  }
  return manifestPromise;
}

function compactCode(prefix: string, number: string) {
  return `${prefix}${number}`.replace(/\s+/g, "").toLowerCase();
}

export async function courseMetadata(prefix: string, number: string): Promise<Metadata> {
  const requested = compactCode(prefix, number);
  const entry = (await readManifest()).find(
    ({ preview }) => compactCode(preview.prefix, preview.number) === requested
  );
  const code = entry ? `${entry.preview.prefix} ${entry.preview.number}` : `${prefix.toUpperCase()} ${number}`;
  const courseTitle = entry?.preview.title.trim();

  return pageMetadata({
    title: `${code} Grade Distribution | ${SITE_NAME}`,
    description:
      `See the grade distribution for ${code}${courseTitle ? ` (${courseTitle})` : ""} at the University of North Texas: ` +
      "overall GPA, A–F breakdowns, and results by professor and semester.",
    path: entry ? coursePath(entry.preview.prefix, entry.preview.number) : coursePath(prefix.toUpperCase(), number),
  });
}

export async function instructorMetadata(slug: string): Promise<Metadata> {
  const requested = fromInstructorSlug(slug);
  const manifest = await readManifest();
  // Matching is case-insensitive, so use the manifest's spelling for the canonical URL.
  const instructor =
    listInstructors(manifest).find(
      ({ firstName, lastName }) =>
        firstName.toLowerCase() === requested.firstName.toLowerCase() &&
        lastName.toLowerCase() === requested.lastName.toLowerCase()
    ) ?? (requested.firstName && requested.lastName ? requested : null);
  const courseCount = instructor ? findInstructorEntries(manifest, instructor.firstName, instructor.lastName).length : 0;
  const name = instructor ? `${instructor.firstName} ${instructor.lastName}` : "Professor";

  return pageMetadata({
    title: `${name} Grade Distribution | ${SITE_NAME}`,
    description:
      `Grade distributions for ${courseCount > 0 ? `${courseCount} course${courseCount === 1 ? "" : "s"}` : "courses"} ` +
      `taught by ${name} at the University of North Texas, with GPA and A–F breakdowns by course and semester.`,
    path: instructor ? instructorPath(instructor.firstName, instructor.lastName) : `/instructor/${slug}`,
  });
}

export async function sitemapPaths() {
  const manifest = await readManifest();
  const courses = new Set(manifest.map(({ preview }) => coursePath(preview.prefix, preview.number)));
  const instructors = listInstructors(manifest).map(({ firstName, lastName }) => instructorPath(firstName, lastName));
  return ["/", "/terms", ...courses, ...instructors];
}
