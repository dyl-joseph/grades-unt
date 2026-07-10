#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const REQUIRED_COLUMNS = [
  'Semester/Term',
  'Subject',
  'Catalog Number',
  'Class Section',
  'Title',
  'Grade',
  'Grade Count',
  'Instructor',
];

const OUTPUT_COLUMNS = [
  'COURSE NAME',
  'SECTION NUMBER',
  'TEACHER NAME',
  'YEAR',
  'TERM',
  'A',
  'B',
  'C',
  'D',
  'F',
  'P',
  'NP',
  'W',
  'I',
];

const GRADE_COLUMNS = ['A', 'B', 'C', 'D', 'F', 'P', 'NP', 'W', 'I'];
const GRADE_ALIASES = new Map([
  ['PR', 'P'],
  ['NPR', 'NP'],
]);
const TERM_ORDER = new Map([
  ['winter', 0],
  ['spring', 1],
  ['maymester', 2],
  ['summer', 3],
  ['fall', 4],
]);

function usage() {
  console.log(`Usage:
  node tools/pivot-grade-sheet.js --input sheet.csv --out prisma/data/grades.csv
  node tools/pivot-grade-sheet.js --sheet-url "https://docs.google.com/spreadsheets/d/<id>/edit" --out prisma/data/grades.csv
  node tools/pivot-grade-sheet.js --input sheet.csv --out prisma/data/grades.csv --semester-label test_semester
  node tools/pivot-grade-sheet.js --input sheet.csv --out prisma/data/grades.csv --split-by-term prisma/data/by-term

Description:
  Pivots long-form grade rows into the UNT Grades encrypt/seed CSV format:
  COURSE NAME, SECTION NUMBER, TEACHER NAME, YEAR, TERM, A, B, C, D, F, P, NP, W, I

Input columns:
  ${REQUIRED_COLUMNS.join(', ')}

Notes:
  - Blank grades are ignored because the target UNT Grades format has no blank-grade column.
  - PR is folded into P and NPR is folded into NP.
  - --semester-label overrides all output YEAR/TERM values; use test_semester for the shared test sheet.
  - Unsupported grade labels are reported in a JSON sidecar file next to --out.
`);
}

function parseArgs(argv) {
  const args = { input: '', sheetUrl: '', out: '', splitByTerm: '', semesterLabel: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--input') {
      args.input = argv[++i] || '';
    } else if (arg === '--sheet-url') {
      args.sheetUrl = argv[++i] || '';
    } else if (arg === '--out') {
      args.out = argv[++i] || '';
    } else if (arg === '--split-by-term') {
      args.splitByTerm = argv[++i] || '';
    } else if (arg === '--semester-label') {
      args.semesterLabel = argv[++i] || '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function googleSheetCsvExportUrl(url) {
  const match = String(url).match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new Error('Could not find a Google spreadsheet ID in --sheet-url');
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
}

async function readInputCsv(args) {
  if (args.input) return fs.readFileSync(args.input, 'utf8');
  if (!args.sheetUrl) throw new Error('Provide either --input or --sheet-url');
  const response = await fetch(googleSheetCsvExportUrl(args.sheetUrl));
  if (!response.ok) {
    throw new Error(`Failed to download sheet CSV: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function assertColumns(rows) {
  if (!rows.length) throw new Error('Input CSV has no rows');
  const actual = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_COLUMNS.filter((column) => !actual.has(column));
  if (missing.length) {
    throw new Error(`Input CSV is missing required column(s): ${missing.join(', ')}`);
  }
}

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeSectionNumber(value) {
  const sectionNumber = clean(value);
  if (!/^\d+$/.test(sectionNumber)) return sectionNumber;
  return String(Number(sectionNumber));
}

function parseGradeCount(value) {
  const cleaned = clean(value).replace(/,/g, '');
  if (!cleaned) return 0;
  const count = Number(cleaned);
  if (!Number.isFinite(count)) throw new Error(`Invalid Grade Count: ${value}`);
  return Math.round(count);
}

function parseTerm(value) {
  const normalized = clean(value).replace(/\^+$/g, '').replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d{4})\s+(.+)$/);
  if (!match) return { year: '', term: normalized };
  return { year: match[1], term: match[2] };
}

function normalizeGrade(rawGrade) {
  const grade = clean(rawGrade).toUpperCase();
  if (!grade) return null;
  return GRADE_ALIASES.get(grade) || grade;
}

function groupKey(parts) {
  return JSON.stringify(parts);
}

function pivotRows(rows, options = {}) {
  assertColumns(rows);

  const sections = new Map();
  const unsupported = new Map();
  let ignoredBlankGradeCount = 0;

  for (const row of rows) {
    const subject = clean(row['Subject']).toUpperCase();
    const catalogNumber = clean(row['Catalog Number']);
    const sectionNumber = normalizeSectionNumber(row['Class Section']);
    const title = clean(row['Title']).replace(/\s+/g, ' ');
    const instructor = clean(row['Instructor']).replace(/\s+/g, ' ');
    const semesterTerm = clean(row['Semester/Term']);
    const parsedSemester = parseTerm(semesterTerm);
    const year = options.semesterLabel ? '' : parsedSemester.year;
    const term = options.semesterLabel || parsedSemester.term;
    const count = parseGradeCount(row['Grade Count']);
    const grade = normalizeGrade(row['Grade']);

    const key = groupKey([semesterTerm, subject, catalogNumber, sectionNumber, title, instructor]);
    if (!sections.has(key)) {
      sections.set(key, {
        semesterTerm,
        subject,
        catalogNumber,
        sectionNumber,
        title,
        instructor,
        year,
        term,
        grades: Object.fromEntries(GRADE_COLUMNS.map((column) => [column, 0])),
      });
    }

    if (!grade) {
      ignoredBlankGradeCount += count;
      continue;
    }
    if (!GRADE_COLUMNS.includes(grade)) {
      unsupported.set(grade, (unsupported.get(grade) || 0) + count);
      continue;
    }

    sections.get(key).grades[grade] += count;
  }

  const outputRows = Array.from(sections.values()).map((section) => ({
    'COURSE NAME': `${section.subject} ${section.catalogNumber} - ${section.title}`,
    'SECTION NUMBER': section.sectionNumber,
    'TEACHER NAME': section.instructor,
    YEAR: section.year,
    TERM: section.term,
    A: section.grades.A,
    B: section.grades.B,
    C: section.grades.C,
    D: section.grades.D,
    F: section.grades.F,
    P: section.grades.P,
    NP: section.grades.NP,
    W: section.grades.W,
    I: section.grades.I,
  }));

  outputRows.sort(compareOutputRows);

  return {
    outputRows,
    summary: {
      inputRows: rows.length,
      outputSections: outputRows.length,
      ignoredBlankGradeCount,
      unsupportedGrades: Object.fromEntries([...unsupported.entries()].sort()),
    },
  };
}

function compareOutputRows(a, b) {
  const yearCompare = String(a.YEAR).localeCompare(String(b.YEAR), undefined, { numeric: true });
  if (yearCompare) return yearCompare;

  const termCompare = termRank(a.TERM) - termRank(b.TERM);
  if (termCompare) return termCompare;

  return (
    String(a['COURSE NAME']).localeCompare(String(b['COURSE NAME']), undefined, { numeric: true }) ||
    String(a['SECTION NUMBER']).localeCompare(String(b['SECTION NUMBER']), undefined, { numeric: true }) ||
    String(a['TEACHER NAME']).localeCompare(String(b['TEACHER NAME']))
  );
}

function termRank(term) {
  const lower = String(term || '').toLowerCase();
  for (const [name, rank] of TERM_ORDER.entries()) {
    if (lower.includes(name)) return rank;
  }
  return 99;
}

function quoteCell(value) {
  const stringValue = String(value ?? '');
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function toCsv(rows) {
  const lines = [OUTPUT_COLUMNS.map(quoteCell).join(',')];
  for (const row of rows) {
    lines.push(OUTPUT_COLUMNS.map((column) => quoteCell(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function termFilename(row) {
  const year = clean(row.YEAR) || 'unknown-year';
  const term = clean(row.TERM).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown-term';
  return `${year}-${term}.csv`;
}

function writeOutputs(rows, outPath, splitByTerm) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, toCsv(rows));

  if (!splitByTerm) return;
  fs.mkdirSync(splitByTerm, { recursive: true });
  const byTerm = new Map();
  for (const row of rows) {
    const file = termFilename(row);
    if (!byTerm.has(file)) byTerm.set(file, []);
    byTerm.get(file).push(row);
  }
  for (const [file, termRows] of byTerm.entries()) {
    fs.writeFileSync(path.join(splitByTerm, file), toCsv(termRows));
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }
  if (!args.out) throw new Error('Provide --out');

  const csvText = await readInputCsv(args);
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  const { outputRows, summary } = pivotRows(rows, { semesterLabel: args.semesterLabel });
  writeOutputs(outputRows, args.out, args.splitByTerm);

  const summaryPath = `${args.out}.summary.json`;
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`Wrote ${outputRows.length} section rows to ${args.out}`);
  if (args.splitByTerm) console.log(`Wrote per-term CSV files to ${args.splitByTerm}`);
  console.log(`Wrote summary to ${summaryPath}`);
  if (Object.keys(summary.unsupportedGrades).length) {
    console.warn(`Unsupported grade labels were ignored: ${JSON.stringify(summary.unsupportedGrades)}`);
  }
  if (summary.ignoredBlankGradeCount) {
    console.warn(`Ignored ${summary.ignoredBlankGradeCount} blank-grade count(s); target format has no blank-grade column.`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  normalizeSectionNumber,
  parseTerm,
  pivotRows,
  toCsv,
};
