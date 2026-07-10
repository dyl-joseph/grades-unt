/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeSectionNumber, pivotRows, toCsv } = require('./pivot-grade-sheet');

function row(overrides = {}) {
  return {
    'Semester/Term': '2019 Fall',
    Subject: 'ACCT',
    'Catalog Number': '2010',
    'Class Section': '001',
    Title: 'ACCOUNT PRIN I',
    Grade: 'A',
    'Grade Count': '14',
    Instructor: 'Rumbough Jr.,Roy Albert',
    ...overrides,
  };
}

test('normalizeSectionNumber matches the existing CSV section style', () => {
  assert.equal(normalizeSectionNumber('001'), '1');
  assert.equal(normalizeSectionNumber(' 010 '), '10');
  assert.equal(normalizeSectionNumber('001A'), '001A');
});

test('pivotRows preserves semester metadata and folds pass grade aliases', () => {
  const result = pivotRows([
    row(),
    row({ Grade: 'B', 'Grade Count': '8' }),
    row({ Grade: 'PR', 'Grade Count': '2' }),
    row({ Grade: 'NPR', 'Grade Count': '1' }),
  ]);

  assert.equal(result.outputRows.length, 1);
  assert.deepEqual(result.outputRows[0], {
    'COURSE NAME': 'ACCT 2010 - ACCOUNT PRIN I',
    'SECTION NUMBER': '1',
    'TEACHER NAME': 'Rumbough Jr.,Roy Albert',
    YEAR: '2019',
    TERM: 'Fall',
    A: 14,
    B: 8,
    C: 0,
    D: 0,
    F: 0,
    P: 2,
    NP: 1,
    W: 0,
    I: 0,
  });
});

test('pivotRows reports blank and unsupported grades without adding them', () => {
  const result = pivotRows([
    row({ Grade: '', 'Grade Count': '4' }),
    row({ Grade: 'Z', 'Grade Count': '1' }),
  ]);

  assert.equal(result.outputRows[0].A, 0);
  assert.equal(result.summary.ignoredBlankGradeCount, 4);
  assert.deepEqual(result.summary.unsupportedGrades, { Z: 1 });
});

test('toCsv writes the semester-aware encryptor schema', () => {
  const { outputRows } = pivotRows([row()]);
  const [header, data] = toCsv(outputRows).trim().split('\n');

  assert.equal(header, 'COURSE NAME,SECTION NUMBER,TEACHER NAME,YEAR,TERM,A,B,C,D,F,P,NP,W,I');
  assert.match(data, /^ACCT 2010 - ACCOUNT PRIN I,1,"Rumbough Jr\.,Roy Albert",2019,Fall,/);
});
