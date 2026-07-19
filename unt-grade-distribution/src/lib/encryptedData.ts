export type ManifestEntry = {
  id: string;
  tokens: string[];
  preview: { prefix: string; number: string; title: string };
};

export type EncryptedSection = {
  sectionNumber: string;
  instructor: { firstName: string; lastName: string };
  year: string | null;
  term: string | null;
  grades: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
    P: number;
    NP: number;
    W: number;
    I: number;
  };
};

export type EncryptedCourse = {
  prefix: string;
  number: string;
  title: string;
  sections: EncryptedSection[];
};

export function sectionHasGrades(section: EncryptedSection) {
  const { A, B, C, D, F, P, NP, W, I } = section.grades;
  return A + B + C + D + F + P + NP + W + I > 0;
}

const COURSE_DATA_KEY_ERROR = "Course data key is missing or invalid for this deployment";

type ParsedInstructor = {
  firstName: string;
  lastName: string;
  normalizedFirstName: string;
  normalizedLastName: string;
  key: string;
};

type IndexedManifestEntry = {
  entry: ManifestEntry;
  courseCode: string;
  compactCourseCode: string;
  title: string;
  courseKey: string;
  instructors: ParsedInstructor[];
};

type ManifestRequest = () => Promise<Response>;

export function getClientDataKey() {
  const configured = process.env.NEXT_PUBLIC_DATA_KEY?.trim();
  if (configured) return configured;

  throw new Error(COURSE_DATA_KEY_ERROR);
}

function b64ToArrayBuffer(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function normalizeWhitespace(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeText(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function compactCourseCode(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function instructorKey(firstName: string, lastName: string) {
  const normalizedFirstName = normalizeText(firstName);
  const normalizedLastName = normalizeText(lastName);
  if (!normalizedFirstName || !normalizedLastName) return null;
  return `${normalizedLastName},${normalizedFirstName}`;
}

function parseInstructorToken(token: unknown): ParsedInstructor | null {
  if (typeof token !== "string") return null;

  const commaIndex = token.indexOf(",");
  if (commaIndex <= 0 || commaIndex === token.length - 1) return null;

  const lastName = normalizeWhitespace(token.slice(0, commaIndex));
  const firstName = normalizeWhitespace(token.slice(commaIndex + 1));
  const normalizedFirstName = normalizeText(firstName);
  const normalizedLastName = normalizeText(lastName);
  if (!normalizedFirstName || !normalizedLastName) return null;

  return { firstName, lastName, normalizedFirstName, normalizedLastName, key: `${normalizedLastName},${normalizedFirstName}` };
}

function instructorTokens(entry: ManifestEntry) {
  return Array.isArray(entry.tokens) ? entry.tokens.slice(2) : [];
}

const manifestIndexCache = new WeakMap<ManifestEntry[], IndexedManifestEntry[]>();

function indexedManifest(manifest: ManifestEntry[]) {
  const cached = manifestIndexCache.get(manifest);
  if (cached) return cached;

  const index = manifest.map((entry) => {
    const courseCode = `${entry.preview.prefix} ${entry.preview.number}`;
    const title = normalizeText(entry.preview.title);
    return {
      entry,
      courseCode: normalizeText(courseCode),
      compactCourseCode: compactCourseCode(courseCode),
      title,
      courseKey: `${normalizeText(entry.preview.prefix)}|${normalizeText(entry.preview.number)}|${title}`,
      instructors: instructorTokens(entry)
        .map(parseInstructorToken)
        .filter((instructor): instructor is ParsedInstructor => instructor !== null),
    };
  });
  manifestIndexCache.set(manifest, index);
  return index;
}

export function createManifestLoader(request: ManifestRequest = () => fetch("/encrypted/manifest.json")) {
  let manifestPromise: Promise<ManifestEntry[]> | null = null;

  return function loadManifest(): Promise<ManifestEntry[]> {
    if (!manifestPromise) {
      manifestPromise = Promise.resolve()
        .then(request)
        .then(async (response) => {
          if (!response.ok) throw new Error("Failed to load manifest");

          const manifest = await response.json();
          if (!Array.isArray(manifest)) throw new Error("Manifest must be an array");
          return manifest as ManifestEntry[];
        });

      void manifestPromise.catch(() => {
        manifestPromise = null;
      });
    }

    return manifestPromise;
  };
}

const loadManifest = createManifestLoader();

export function fetchManifest(): Promise<ManifestEntry[]> {
  return loadManifest();
}

async function deriveKeyFromPassphrase(passphrase: string, salt: ArrayBuffer, iterations: number) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  return key;
}

export async function decryptBlob(blobId: string, passphrase?: string) {
  // Fetch blob and meta (meta contains iv and salt)
  const [blobRes, metaRes] = await Promise.all([
    fetch(`/encrypted/blobs/${blobId}`),
    fetch(`/encrypted/blobs/${blobId.replace(/\.bin$/, '.meta.json')}`),
  ]);
  if (!blobRes.ok || !metaRes.ok) throw new Error('Failed to fetch blob or metadata');

  const meta = await metaRes.json();
  const iv = b64ToArrayBuffer(meta.iv);
  const salt = b64ToArrayBuffer(meta.salt);
  const iterations = meta.iterations || 200000;

  const effectivePassphrase = passphrase ?? getClientDataKey();
  const key = await deriveKeyFromPassphrase(effectivePassphrase, salt, iterations);

  const cipherBuffer = await blobRes.arrayBuffer();

  // In Node we stored ciphertext||tag in the blob file; WebCrypto accepts that format.
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, cipherBuffer);
  const text = new TextDecoder().decode(plainBuf);
  return JSON.parse(text);
}

export function toInstructorSlug(firstName: string, lastName: string) {
  return encodeURIComponent(`${lastName},${firstName}`);
}

export function fromInstructorSlug(slug: string) {
  try {
    const instructor = parseInstructorToken(decodeURIComponent(slug));
    return instructor
      ? { firstName: instructor.firstName, lastName: instructor.lastName }
      : { firstName: "", lastName: "" };
  } catch {
    return { firstName: "", lastName: "" };
  }
}

export function findInstructorEntries(manifest: ManifestEntry[], firstName: string, lastName: string) {
  const targetKey = instructorKey(firstName, lastName);
  if (!targetKey) return [];

  return indexedManifest(manifest)
    .filter(({ instructors }) => instructors.some((instructor) => instructor.key === targetKey))
    .map(({ entry }) => entry);
}

export async function searchManifest(q: string) {
  const query = normalizeText(q);
  if (query.length < 2) return { courses: [], instructors: [] as Array<{ id: string; firstName: string; lastName: string }> };

  const manifest = await fetchManifest();
  const compactQuery = compactCourseCode(query);
  const instructorQuery = query.replace(/\s*,\s*/g, ",");

  const courseHits = new Map<string, { score: number; prefix: string; number: string; title: string }>();
  const instructorMap = new Map<string, { score: number; id: string; firstName: string; lastName: string }>();

  for (const indexedEntry of indexedManifest(manifest)) {
    const { entry, courseCode, compactCourseCode: compactCourse, courseKey, instructors, title } = indexedEntry;

    let courseScore = -1;
    if (compactCourse === compactQuery) {
      courseScore = 120;
    } else if (compactCourse.startsWith(compactQuery)) {
      courseScore = 100;
    } else if (courseCode.includes(query) || compactCourse.includes(compactQuery)) {
      courseScore = 80;
    } else if (title.includes(query)) {
      courseScore = title.startsWith(query) ? 70 : 50;
    }

    if (courseScore >= 0) {
      const existing = courseHits.get(courseKey);
      if (!existing || existing.score < courseScore) {
        courseHits.set(courseKey, {
          score: courseScore,
          prefix: entry.preview.prefix,
          number: entry.preview.number,
          title: entry.preview.title,
        });
      }
    }

    for (const instructor of instructors) {
      const { normalizedLastName: lastOnly, normalizedFirstName: firstOnly } = instructor;

      let score = -1;
      if (instructor.key.includes(instructorQuery)) score = instructor.key.startsWith(instructorQuery) ? 100 : 90;
      else if (lastOnly.includes(query)) score = lastOnly.startsWith(query) ? 95 : 70;
      else if (firstOnly.includes(query)) score = firstOnly.startsWith(query) ? 75 : 50;

      if (score < 0) continue;

      const existing = instructorMap.get(instructor.key);
      if (!existing || existing.score < score) {
        instructorMap.set(instructor.key, {
          score,
          id: toInstructorSlug(instructor.firstName, instructor.lastName),
          firstName: instructor.firstName,
          lastName: instructor.lastName,
        });
      }
    }
  }

  const sortedCourses = Array.from(courseHits.values()).sort(
    (a, b) => b.score - a.score || a.prefix.localeCompare(b.prefix) || a.number.localeCompare(b.number)
  );
  const instructors = Array.from(instructorMap.values())
    .sort((a, b) => b.score - a.score || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .slice(0, 8)
    .map(({ id, firstName, lastName }) => ({ id, firstName, lastName }));

  const courses = sortedCourses.slice(0, 8).map((course, idx) => ({
    id: idx + 1,
    prefix: course.prefix,
    number: course.number,
    title: course.title,
  }));

  return { courses, instructors };
}

export async function loadCourseByCode(prefix: string, number: string, passphrase?: string): Promise<EncryptedCourse | null> {
  const manifest = await fetchManifest();
  const requestedCode = compactCourseCode(`${prefix} ${number}`);
  const entry = manifest.find((item) => compactCourseCode(`${item.preview.prefix} ${item.preview.number}`) === requestedCode);
  if (!entry) return null;

  try {
    const course = (await decryptBlob(entry.id, passphrase)) as EncryptedCourse;
    const sections = course.sections.filter(sectionHasGrades);
    if (sections.length === 0) return null;

    return { ...course, sections };
  } catch (error) {
    if (isCourseDataKeyError(error)) {
      throw new Error(COURSE_DATA_KEY_ERROR);
    }
    throw error;
  }
}

function isCourseDataKeyError(error: unknown) {
  if (error instanceof Error && error.message === COURSE_DATA_KEY_ERROR) return true;
  return error instanceof DOMException && error.name === "OperationError";
}

export async function loadInstructorSections(firstName: string, lastName: string, passphrase?: string) {
  const targetKey = instructorKey(firstName, lastName);
  if (!targetKey) return [];

  const manifest = await fetchManifest();
  const matchingEntries = findInstructorEntries(manifest, firstName, lastName);
  const courses = await Promise.all(
    matchingEntries.map(async (entry) => {
      try {
        return (await decryptBlob(entry.id, passphrase)) as EncryptedCourse;
      } catch (error) {
        if (isCourseDataKeyError(error)) throw new Error(COURSE_DATA_KEY_ERROR);
        return null;
      }
    })
  );

  const sections: Array<EncryptedSection & { course: { prefix: string; number: string; title: string } }> = [];

  for (const course of courses) {
    if (!course) continue;

    for (const section of course.sections) {
      if (instructorKey(section.instructor.firstName, section.instructor.lastName) === targetKey && sectionHasGrades(section)) {
        sections.push({
          ...section,
          course: { prefix: course.prefix, number: course.number, title: course.title },
        });
      }
    }
  }

  return sections;
}
