/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');

const { convertSpotRows, readXlsxRows, spotKey, toCsv } = require('./convert-spot');

function reportRow(overrides = {}) {
  return {
    Username: 'abc0001',
    'Emp ID': '10000001',
    Term: 'Spring',
    Year: '2026',
    'Course Prefix': 'CSCE',
    'Course Number': '1030',
    Section: '001',
    'Overall Summative Rating (Median)': '4.5999999999999996',
    'Challenge and Engagement Index (CEI)': '5.2',
    'Number of Completed Questionnaires': '12',
    'Number of Enrolled Students': '30',
    'Evaluation ID': '1',
    ...overrides,
  };
}

/** Build an uncompressed zip so the .xlsx reader can be tested without a binary fixture. */
function storedZip(files) {
  const locals = [];
  const directory = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(text);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuffer, data);
    directory.push(central, nameBuffer);
    offset += 30 + nameBuffer.length + data.length;
  }
  const directoryBuffer = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directoryBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directoryBuffer, end]);
}

test('writes rounded ratings without instructor identifiers', () => {
  const { rows, stats } = convertSpotRows([reportRow()]);

  assert.deepEqual(rows, [{
    YEAR: '2026',
    TERM: 'Spring',
    PREFIX: 'CSCE',
    NUMBER: '1030',
    SECTION: '1',
    RATING: 4.6,
    CEI: 5.2,
    RESPONSES: 12,
    ENROLLED: 30,
  }]);
  assert.equal(stats.sections, 1);
  assert.doesNotMatch(toCsv(rows), /abc0001|10000001/);
});

test('drops unrated and low-response sections', () => {
  const { rows, stats } = convertSpotRows([
    reportRow({ Section: '1', 'Overall Summative Rating (Median)': '', 'Number of Completed Questionnaires': '0' }),
    reportRow({ Section: '2', 'Number of Completed Questionnaires': '4' }),
    reportRow({ Section: '3', 'Number of Completed Questionnaires': '5', 'Challenge and Engagement Index (CEI)': '' }),
  ]);

  assert.deepEqual(rows.map((row) => [row.SECTION, row.CEI]), [['3', '']]);
  assert.equal(stats.noRating, 1);
  assert.equal(stats.lowResponses, 1);
  assert.equal(convertSpotRows([reportRow({ 'Number of Completed Questionnaires': '4' })], { minResponses: 3 }).rows.length, 1);
});

test('keeps a shared evaluation once and drops per-instructor evaluations of one section', () => {
  const { rows, stats } = convertSpotRows([
    reportRow({ Section: '301', Username: 'a', 'Evaluation ID': '7' }),
    reportRow({ Section: '301', Username: 'b', 'Evaluation ID': '7' }),
    reportRow({ Section: '401', Username: 'a', 'Evaluation ID': '8' }),
    reportRow({ Section: '401', Username: 'b', 'Evaluation ID': '9', 'Number of Completed Questionnaires': '1' }),
  ]);

  assert.deepEqual(rows.map((row) => row.SECTION), ['301']);
  assert.equal(stats.ambiguousSections, 1);
});

test('rejects reports without the expected columns', () => {
  assert.throws(() => convertSpotRows([{ Term: 'Spring' }]), /missing columns/);
});

test('section keys ignore case and leading zeros', () => {
  assert.equal(
    spotKey({ year: '2026', term: 'SPRING', prefix: 'csce', number: '5174z', section: '005' }),
    spotKey({ year: 2026, term: 'Spring', prefix: 'CSCE', number: '5174Z', section: '5' }),
  );
});

test('reads shared, inline and numeric cells from the first worksheet', () => {
  const xlsx = storedZip({
    'xl/sharedStrings.xml': '<sst><si><t>Term</t></si><si><r><t>Rock &amp; </t></r><r><t>Roll</t></r></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData>'
      + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Year</t></is></c><c r="D1" t="inlineStr"><is><t>Rating</t></is></c></row>'
      + '<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>2026</v></c><c r="C2" s="1"/><c r="D2"><v>4.5</v></c></row>'
      + '</sheetData></worksheet>',
  });

  assert.deepEqual(readXlsxRows(xlsx), [{ Term: 'Rock & Roll', Year: '2026', '': '', Rating: '4.5' }]);
});
