#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Build-time encryptor: read CSVs from prisma/data, group per-course, and
// produce encrypted blobs + manifest in public/encrypted.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const { randomUUID } = require('crypto');

const GRADE_COLUMNS = ['A', 'B', 'C', 'D', 'F', 'P', 'NP', 'W', 'I'];

function sectionHasGrades(section) {
  const gradeCount = GRADE_COLUMNS.reduce(
    (total, grade) => total + (Number(section.grades[grade]) || 0),
    0,
  );

  return gradeCount > 0;
}

function courseWithGradedSections(course) {
  return {
    ...course,
    sections: course.sections.filter(sectionHasGrades),
  };
}

const DATA_DIR = path.join(__dirname, '..', 'prisma', 'data');
const OUT_DIR = path.join(__dirname, '..', 'public', 'encrypted');

const ITERATIONS = parseInt(process.env.PBKDF2_ITERATIONS || '200000', 10);

const DEFAULT_YEAR = process.env.DEFAULT_DATA_YEAR || '2025';
const DEFAULT_TERM = process.env.DEFAULT_DATA_TERM || 'Fall';

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function b64(buf) {
  return Buffer.from(buf).toString('base64');
}

function encryptBuffer(plainBuf, passphrase, salt, iv) {
  const key = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store ciphertext||tag for simpler browser decryption
  return Buffer.concat([ciphertext, tag]);
}

function parseTeacherName(name) {
  const commaIdx = (name || '').indexOf(',');
  const lastName = commaIdx > -1 ? name.substring(0, commaIdx).trim() : (name || 'Staff').trim();
  const firstName = commaIdx > -1 ? name.substring(commaIdx + 1).trim() : '';
  return { firstName, lastName };
}

function keyForCourse(prefix, number) {
  return `${prefix}|${number}`;
}

function normalizeNamePart(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function instructorManifestToken(instructor) {
  const lastName = normalizeNamePart(instructor?.lastName);
  const firstName = normalizeNamePart(instructor?.firstName);
  if (!lastName || !firstName) return null;
  return `${lastName},${firstName}`;
}

function manifestTokensForCourse(course) {
  const instructors = new Map();

  for (const section of course.sections) {
    const token = instructorManifestToken(section.instructor);
    if (!token) continue;

    const key = token.normalize('NFKC').toLowerCase();
    if (!instructors.has(key)) instructors.set(key, token);
  }

  return [
    `${course.prefix} ${course.number}`,
    course.title,
    ...instructors.values(),
  ];
}

async function main() {
  if (!process.env.MASTER_PASSPHRASE) {
    console.error('Please set MASTER_PASSPHRASE environment variable to encrypt data.');
    process.exit(1);
  }
  const passphrase = process.env.MASTER_PASSPHRASE;

  if (!fs.existsSync(DATA_DIR)) {
    console.error('No data directory found at', DATA_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv'));
  if (files.length === 0) {
    console.error('No CSV files found in', DATA_DIR);
    process.exit(1);
  }

  const courseMap = new Map();
  for (const file of files) {
    const csv = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
    const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    for (const row of rows) {
      const courseName = row['COURSE NAME'] || '';
      const [prefixNumber, ...titleParts] = courseName.split(' - ');
      const title = (titleParts.join(' - ') || prefixNumber).trim();
      const match = prefixNumber.match(/^([A-Z]+)\s+(.+)$/);
      const prefix = match ? match[1] : prefixNumber;
      const number = match ? match[2].trim() : '';

      const teacherName = row['TEACHER NAME'] || '';
      const { firstName, lastName } = parseTeacherName(teacherName);

      const section = {
        sectionNumber: String(row['SECTION NUMBER'] || ''),
        instructor: { firstName, lastName },
        year: row['YEAR'] ? String(row['YEAR']).trim() : DEFAULT_YEAR,
        term: row['TERM'] ? String(row['TERM']).trim() : DEFAULT_TERM,
        grades: {
          A: Math.round(parseFloat(row['A']) || 0),
          B: Math.round(parseFloat(row['B']) || 0),
          C: Math.round(parseFloat(row['C']) || 0),
          D: Math.round(parseFloat(row['D']) || 0),
          F: Math.round(parseFloat(row['F']) || 0),
          P: Math.round(parseFloat(row['P']) || 0),
          NP: Math.round(parseFloat(row['NP']) || 0),
          W: Math.round(parseFloat(row['W']) || 0),
          I: Math.round(parseFloat(row['I']) || 0),
        },
      };

      const courseKey = keyForCourse(prefix, number);
      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, { prefix, number, title, sections: [] });
      }
      courseMap.get(courseKey).sections.push(section);
    }
  }

  const buildDir = path.join(path.dirname(OUT_DIR), `.encrypted-build-${process.pid}`);
  const buildBlobsDir = path.join(buildDir, 'blobs');
  fs.rmSync(buildDir, { recursive: true, force: true });
  ensureDir(buildBlobsDir);

  try {
    const manifest = [];
    console.log(`Encrypting ${courseMap.size} course blobs...`);
    for (const course of courseMap.values()) {
      const filteredCourse = courseWithGradedSections(course);
      if (filteredCourse.sections.length === 0) continue;

      const id = randomUUID().replace(/-/g, '');
      const outName = `${id}.bin`;
      const metaName = `${id}.meta.json`;
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);

      const plain = Buffer.from(JSON.stringify(filteredCourse), 'utf8');
      const ciphertext = encryptBuffer(plain, passphrase, salt, iv);

      fs.writeFileSync(path.join(buildBlobsDir, outName), ciphertext);
      fs.writeFileSync(path.join(buildBlobsDir, metaName), JSON.stringify({ iv: b64(iv), salt: b64(salt), iterations: ITERATIONS }));

      const tokens = manifestTokensForCourse(filteredCourse);
      manifest.push({ id: outName, tokens, preview: { prefix: filteredCourse.prefix, number: filteredCourse.number, title: filteredCourse.title } });
    }

    fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.renameSync(buildDir, OUT_DIR);
  } finally {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  console.log('Wrote manifest.json and blobs to', OUT_DIR);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Encryptor failed:', e);
    process.exit(1);
  });
}

module.exports = { courseWithGradedSections, sectionHasGrades, manifestTokensForCourse };
