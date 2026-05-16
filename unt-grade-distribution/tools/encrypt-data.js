#!/usr/bin/env node
// Build-time encryptor: read CSVs from prisma/data, group per-course, and
// produce encrypted blobs + manifest in public/encrypted.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'prisma', 'data');
const OUT_DIR = path.join(__dirname, '..', 'public', 'encrypted');
const BLOBS_DIR = path.join(OUT_DIR, 'blobs');

const ITERATIONS = parseInt(process.env.PBKDF2_ITERATIONS || '200000', 10);
if (!process.env.MASTER_PASSPHRASE) {
  console.error('Please set MASTER_PASSPHRASE environment variable to encrypt data.');
  process.exit(1);
}
const PASSPHRASE = process.env.MASTER_PASSPHRASE;

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

async function main() {
  ensureDir(BLOBS_DIR);

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
        year: row['YEAR'] ? String(row['YEAR']).trim() : null,
        term: row['TERM'] ? String(row['TERM']).trim() : null,
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

  const manifest = [];
  console.log(`Encrypting ${courseMap.size} course blobs...`);
  for (const [k, course] of courseMap.entries()) {
    const id = randomUUID().replace(/-/g, '');
    const outName = `${id}.bin`;
    const metaName = `${id}.meta.json`;
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    const plain = Buffer.from(JSON.stringify(course), 'utf8');
    const ciphertext = encryptBuffer(plain, PASSPHRASE, salt, iv);

    fs.writeFileSync(path.join(BLOBS_DIR, outName), ciphertext);
    fs.writeFileSync(path.join(BLOBS_DIR, metaName), JSON.stringify({ iv: b64(iv), salt: b64(salt), iterations: ITERATIONS }));

    // Tokens for simple client-side search - keep these small
    const instructorTokens = course.sections.flatMap((s) => [
      s.instructor.lastName,
      `${s.instructor.lastName},${s.instructor.firstName}`,
    ]);
    const tokens = [ `${course.prefix} ${course.number}`, course.title, ...instructorTokens ].slice(0, 80);
    manifest.push({ id: outName, tokens, preview: { prefix: course.prefix, number: course.number, title: course.title } });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest.json and blobs to', OUT_DIR);
}

main().catch((e) => {
  console.error('Encryptor failed:', e);
  process.exit(1);
});
