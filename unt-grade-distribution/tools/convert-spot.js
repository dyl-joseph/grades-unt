#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Convert a UNT SPOT (Student Perceptions of Teaching) section report into the
// identifier-free CSV that tools/encrypt-data.js merges onto graded sections.
//
// The source report identifies instructors only by username and employee ID.
// Neither is written out: ratings are joined to grade data by course, section
// and semester, which already carries the instructor's name.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { parse } = require('csv-parse/sync');

const OUTPUT_COLUMNS = ['YEAR', 'TERM', 'PREFIX', 'NUMBER', 'SECTION', 'RATING', 'CEI', 'RESPONSES', 'ENROLLED'];
const DEFAULT_MIN_RESPONSES = 3;

const SOURCE = {
  year: 'Year',
  term: 'Term',
  prefix: 'Course Prefix',
  number: 'Course Number',
  section: 'Section',
  rating: 'Overall Summative Rating (Median)',
  cei: 'Challenge and Engagement Index (CEI)',
  responses: 'Number of Completed Questionnaires',
  enrolled: 'Number of Enrolled Students',
  evaluation: 'Evaluation ID',
};

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeSectionNumber(value) {
  const sectionNumber = clean(value).toUpperCase();
  if (!/^\d+$/.test(sectionNumber)) return sectionNumber;
  return String(Number(sectionNumber));
}

/** Key shared with the encryptor: one section of one course in one semester. */
function spotKey({ year, term, prefix, number, section }) {
  return [
    clean(year),
    clean(term).toLowerCase(),
    clean(prefix).toUpperCase(),
    clean(number).toUpperCase(),
    normalizeSectionNumber(section),
  ].join('|');
}

function toNumber(value) {
  const text = clean(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function roundTenth(value) {
  return Math.round(value * 10) / 10;
}

// ── Minimal .xlsx reader (first worksheet only) ──────────────────────────────

function readZipEntries(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Not a valid .xlsx file (no zip directory found)');

  const entries = new Map();
  let offset = buffer.readUInt32LE(end + 16);
  const count = buffer.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt zip directory');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.set(name, () => {
      const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return data.toString('utf8');
      if (method === 8) return zlib.inflateRawSync(data).toString('utf8');
      throw new Error(`Unsupported zip compression method ${method} for ${name}`);
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function decodeXml(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function textRuns(xml) {
  let text = '';
  for (const match of xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
    text += decodeXml(match[1]);
  }
  return text;
}

function columnIndex(cellRef) {
  let index = 0;
  for (const char of cellRef.match(/^[A-Z]+/)[0]) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

function readXlsxRows(buffer) {
  const entries = readZipEntries(buffer);
  const sheetName = entries.has('xl/worksheets/sheet1.xml')
    ? 'xl/worksheets/sheet1.xml'
    : [...entries.keys()].filter((name) => /^xl\/worksheets\/[^/]+\.xml$/.test(name)).sort()[0];
  if (!sheetName) throw new Error('No worksheet found in .xlsx file');

  const sharedStrings = entries.has('xl/sharedStrings.xml')
    ? Array.from(entries.get('xl/sharedStrings.xml')().matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g), (match) => textRuns(match[1]))
    : [];

  const table = [];
  for (const rowMatch of entries.get(sheetName)().matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = cellMatch[1].match(/\br="([A-Z]+\d+)"/);
      if (!ref) continue;
      const type = cellMatch[1].match(/\bt="([^"]+)"/)?.[1];
      const body = cellMatch[2] || '';
      const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      let value = '';
      if (type === 'inlineStr') value = textRuns(body);
      else if (raw !== undefined) value = type === 's' ? sharedStrings[Number(raw)] ?? '' : decodeXml(raw);
      cells[columnIndex(ref[1])] = value;
    }
    table.push(Array.from(cells, (cell) => cell ?? ''));
  }

  const [header = [], ...body] = table;
  return body.map((cells) => Object.fromEntries(header.map((name, index) => [clean(name), cells[index] ?? ''])));
}

function readSourceRows(inputPath) {
  const buffer = fs.readFileSync(inputPath);
  if (path.extname(inputPath).toLowerCase() === '.xlsx') return readXlsxRows(buffer);
  return parse(buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true });
}

// ── Conversion ───────────────────────────────────────────────────────────────

/**
 * Reduce report rows to one publishable rating per section.
 *
 * - Rows without a rating, or with fewer than `minResponses` completed
 *   questionnaires, are dropped: a median of a handful of answers is noise and
 *   can expose an individual student's response.
 * - A section evaluated separately for several instructors is dropped, because
 *   the report gives no name to say which rating belongs to whom.
 */
function convertSpotRows(rows, { minResponses = DEFAULT_MIN_RESPONSES } = {}) {
  if (rows.length > 0) {
    const missing = Object.values(SOURCE).filter((column) => !(column in rows[0]));
    if (missing.length > 0) throw new Error(`SPOT report is missing columns: ${missing.join(', ')}`);
  }

  const stats = { rows: rows.length, noRating: 0, lowResponses: 0, ambiguousSections: 0, sections: 0 };
  const sections = new Map();

  for (const row of rows) {
    const rating = toNumber(row[SOURCE.rating]);
    const responses = toNumber(row[SOURCE.responses]) ?? 0;
    const record = {
      year: clean(row[SOURCE.year]),
      term: clean(row[SOURCE.term]),
      prefix: clean(row[SOURCE.prefix]).toUpperCase(),
      number: clean(row[SOURCE.number]).toUpperCase(),
      section: normalizeSectionNumber(row[SOURCE.section]),
      rating,
      cei: toNumber(row[SOURCE.cei]),
      responses,
      enrolled: toNumber(row[SOURCE.enrolled]) ?? 0,
      evaluation: clean(row[SOURCE.evaluation]),
    };
    if (!record.year || !record.term || !record.prefix || !record.number || !record.section) continue;

    // Track every evaluation of the section, including unusable ones, so a
    // team-taught section is never attributed to whichever row happened to pass.
    const key = spotKey(record);
    const entry = sections.get(key) || { evaluations: new Set(), record: null };
    entry.evaluations.add(record.evaluation);
    sections.set(key, entry);

    if (rating === null || responses === 0) {
      stats.noRating++;
    } else if (responses < minResponses) {
      stats.lowResponses++;
    } else if (!entry.record) {
      entry.record = record;
    }
  }

  const output = [];
  for (const { evaluations, record } of sections.values()) {
    if (evaluations.size > 1) {
      stats.ambiguousSections++;
      continue;
    }
    if (!record) continue;
    output.push({
      YEAR: record.year,
      TERM: record.term,
      PREFIX: record.prefix,
      NUMBER: record.number,
      SECTION: record.section,
      RATING: roundTenth(record.rating),
      CEI: record.cei === null ? '' : roundTenth(record.cei),
      RESPONSES: record.responses,
      ENROLLED: record.enrolled,
    });
  }
  stats.sections = output.length;
  return { rows: output, stats };
}

function toCsv(rows) {
  const lines = [OUTPUT_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(OUTPUT_COLUMNS.map((column) => {
      const value = String(row[column] ?? '');
      return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const args = { minResponses: DEFAULT_MIN_RESPONSES };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--min-responses') args.minResponses = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const USAGE = `Usage: node tools/convert-spot.js --input <report.xlsx|report.csv> [--out <file.csv>] [--min-responses ${DEFAULT_MIN_RESPONSES}]

Writes an identifier-free SPOT CSV. Without --out, the file is written to
prisma/data/spot/spot-<year>-<term>.csv, where the encryptor picks it up.`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }
  if (!Number.isInteger(args.minResponses) || args.minResponses < 1) {
    throw new Error('--min-responses must be a positive integer');
  }

  const { rows, stats } = convertSpotRows(readSourceRows(args.input), { minResponses: args.minResponses });
  if (rows.length === 0) throw new Error('No publishable SPOT rows found in the report');

  const semesters = new Set(rows.map((row) => `${row.YEAR}-${row.TERM.toLowerCase()}`));
  const defaultName = `spot-${semesters.size === 1 ? [...semesters][0] : 'combined'}.csv`;
  const outPath = args.out || path.join(__dirname, '..', 'prisma', 'data', 'spot', defaultName);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, toCsv(rows));

  console.log(`Read ${stats.rows} report rows`);
  console.log(`  skipped ${stats.noRating} with no rating or no responses`);
  console.log(`  skipped ${stats.lowResponses} with fewer than ${args.minResponses} responses`);
  console.log(`  skipped ${stats.ambiguousSections} sections evaluated separately for several instructors`);
  console.log(`Wrote ${stats.sections} section ratings to ${outPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { convertSpotRows, normalizeSectionNumber, readXlsxRows, spotKey, toCsv };
