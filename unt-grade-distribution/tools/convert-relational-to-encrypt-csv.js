#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.join(__dirname, '..', 'prisma', 'data');
const OUT_FILE = path.join(DATA_DIR, 'combined_for_encrypt.csv');

function ensureExists(p) {
  if (!fs.existsSync(p)) {
    console.error('Missing expected file:', p);
    process.exit(1);
  }
}

function quoteCell(s) {
  if (s == null) return '';
  const str = String(s);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function readCsv(name) {
  const p = path.join(DATA_DIR, name);
  ensureExists(p);
  const raw = fs.readFileSync(p, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

// Required source files
const coursesFile = 'courses_rows.csv';
const instructorsFile = 'instructors_rows.csv';
const sectionsFile = 'sections_rows.csv';

ensureExists(path.join(DATA_DIR, coursesFile));
ensureExists(path.join(DATA_DIR, instructorsFile));
ensureExists(path.join(DATA_DIR, sectionsFile));

const courses = readCsv(coursesFile);
const instructors = readCsv(instructorsFile);
const sections = readCsv(sectionsFile);

const courseById = new Map();
for (const r of courses) {
  // expects id,prefix,number,title
  courseById.set(String(r.id), { prefix: r.prefix, number: r.number, title: r.title });
}

const instrById = new Map();
for (const r of instructors) {
  // expects id,first_name,last_name
  instrById.set(String(r.id), { first_name: r.first_name || '', last_name: r.last_name || '' });
}

// Build rows — grades already in sections_rows.csv
const outRows = [];
for (const s of sections) {
  // expects id,course_id,section_number,instructor_id,grade_a,grade_b,...,year,term
  const course = courseById.get(String(s.course_id));
  if (!course) {
    console.warn('Missing course for section', s);
    continue;
  }
  const instr = instrById.get(String(s.instructor_id)) || { first_name: '', last_name: '' };
  // Read grades directly from section row
  const g = {
    A: Number(s.grade_a || 0),
    B: Number(s.grade_b || 0),
    C: Number(s.grade_c || 0),
    D: Number(s.grade_d || 0),
    F: Number(s.grade_f || 0),
    P: Number(s.grade_p || 0),
    NP: Number(s.grade_np || 0),
    W: Number(s.grade_w || 0),
    I: Number(s.grade_i || 0),
  };
  const courseName = `${course.prefix} ${course.number} - ${course.title}`;
  const teacherName = instr.last_name ? `${instr.last_name},${instr.first_name}` : instr.first_name || instr.last_name || 'Staff';
  const sectionNum = s.section_number || '';
  const yearVal = s.year || '2025'; // Default to 2025 if not in sections_rows
  const termVal = s.term || 'Fall';  // Default to Fall if not in sections_rows
  const row = [
    courseName,
    sectionNum,
    teacherName,
    yearVal,
    termVal,
    g.A, g.B, g.C, g.D, g.F, g.P, g.NP, g.W, g.I
  ];
  outRows.push({ row, total: g.A + g.B + g.C + g.D + g.F + g.P + g.NP + g.W + g.I });
}

// Write CSV with header: COURSE NAME,SECTION NUMBER,TEACHER NAME,YEAR,TERM,A,B,C,D,F,P,NP,W,I
const header = ['COURSE NAME','SECTION NUMBER','TEACHER NAME','YEAR','TERM','A','B','C','D','F','P','NP','W','I'];
const lines = [header.map(quoteCell).join(',')];
for (const r of outRows) {
  lines.push(r.row.map(quoteCell).join(','));
}
fs.writeFileSync(OUT_FILE, lines.join('\n'));
console.log('Wrote combined CSV to', OUT_FILE);
