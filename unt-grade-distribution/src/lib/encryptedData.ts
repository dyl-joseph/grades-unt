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

let manifestCache: ManifestEntry[] | null = null;

export function getClientDataKey() {
  const configured = process.env.NEXT_PUBLIC_DATA_KEY?.trim();
  if (configured) return configured;

  // Fallback key keeps UX zero-friction, but is only obfuscation-grade.
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `grade-explorer:${host}:v1`;
}

function b64ToArrayBuffer(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function fetchManifest(): Promise<ManifestEntry[]> {
  if (manifestCache) return manifestCache;
  const res = await fetch('/encrypted/manifest.json');
  if (!res.ok) throw new Error('Failed to load manifest');
  manifestCache = (await res.json()) as ManifestEntry[];
  return manifestCache;
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
  const decoded = decodeURIComponent(slug);
  const [lastName, ...firstParts] = decoded.split(',');
  return {
    lastName: (lastName || '').trim(),
    firstName: firstParts.join(',').trim(),
  };
}

export async function searchManifest(q: string) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return { courses: [], instructors: [] as Array<{ id: string; firstName: string; lastName: string }> };

  const manifest = await fetchManifest();
  const hasCourseSignal = /\d/.test(query) || /\b[a-z]{1,4}\s*\d/i.test(query);

  const courseHits: Array<{ score: number; prefix: string; number: string; title: string }> = [];
  const instructorMap = new Map<string, { score: number; id: string; firstName: string; lastName: string }>();

  for (const entry of manifest) {
    const courseCode = `${entry.preview.prefix} ${entry.preview.number}`.toLowerCase();
    const title = entry.preview.title.toLowerCase();

    let courseScore = -1;
    if (courseCode.includes(query)) {
      courseScore = courseCode.startsWith(query) ? 100 : 80;
    } else if (title.includes(query)) {
      courseScore = title.startsWith(query) ? 70 : 50;
    }

    if (courseScore >= 0) {
      courseHits.push({
        score: courseScore,
        prefix: entry.preview.prefix,
        number: entry.preview.number,
        title: entry.preview.title,
      });
    }

    for (const token of entry.tokens) {
      if (!token.includes(',')) continue;
      const [lastName, ...firstParts] = token.split(',');
      if (!lastName || firstParts.length === 0) continue;
      const firstName = firstParts.join(',').trim();
      const fullName = `${lastName.trim()},${firstName}`.toLowerCase();
      const lastOnly = lastName.trim().toLowerCase();
      const firstOnly = firstName.toLowerCase();

      let score = -1;
      if (fullName.includes(query)) score = fullName.startsWith(query) ? 100 : 90;
      else if (lastOnly.includes(query)) score = lastOnly.startsWith(query) ? 95 : 70;
      else if (firstOnly.includes(query)) score = firstOnly.startsWith(query) ? 75 : 50;

      if (score < 0) continue;

      const key = `${lastOnly}|${firstOnly}`;
      const existing = instructorMap.get(key);
      if (!existing || existing.score < score) {
        instructorMap.set(key, {
          score,
          id: toInstructorSlug(firstName, lastName.trim()),
          firstName,
          lastName: lastName.trim(),
        });
      }
    }
  }

  courseHits.sort((a, b) => b.score - a.score || a.prefix.localeCompare(b.prefix) || a.number.localeCompare(b.number));
  const instructors = Array.from(instructorMap.values())
    .sort((a, b) => b.score - a.score || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .slice(0, 8)
    .map(({ score, ...rest }) => rest);

  const courses = courseHits.slice(0, 8).map((course, idx) => ({
    id: idx + 1,
    prefix: course.prefix,
    number: course.number,
    title: course.title,
  }));

  return { courses, instructors };
}

export async function loadCourseByCode(prefix: string, number: string, passphrase?: string): Promise<EncryptedCourse | null> {
  const manifest = await fetchManifest();
  const entry = manifest.find(
    (m) => m.preview.prefix.toLowerCase() === prefix.toLowerCase() && m.preview.number.toLowerCase() === number.toLowerCase()
  );
  if (!entry) return null;
  return (await decryptBlob(entry.id, passphrase)) as EncryptedCourse;
}

export async function loadInstructorSections(firstName: string, lastName: string, passphrase?: string) {
  const manifest = await fetchManifest();
  const needleLast = lastName.toLowerCase();
  const needleFirst = firstName.toLowerCase();
  const maybeEntries = manifest.filter((m) =>
    m.tokens.some((t) => {
      const lower = t.toLowerCase();
      return lower.includes(needleLast) || lower.includes(`${needleLast},${needleFirst}`);
    })
  );

  const sections: Array<EncryptedSection & { course: { prefix: string; number: string; title: string } }> = [];

  for (const entry of maybeEntries) {
    const course = (await decryptBlob(entry.id, passphrase)) as EncryptedCourse;
    for (const section of course.sections) {
      if (
        section.instructor.lastName.toLowerCase() === needleLast &&
        section.instructor.firstName.toLowerCase() === needleFirst
      ) {
        sections.push({
          ...section,
          course: { prefix: course.prefix, number: course.number, title: course.title },
        });
      }
    }
  }

  return sections;
}
