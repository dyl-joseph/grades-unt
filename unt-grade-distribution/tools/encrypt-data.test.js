const test = require('node:test');
const assert = require('node:assert/strict');

const {
  attachSpot,
  buildSpotIndex,
  courseWithGradedSections,
  manifestTokensForCourse,
  sectionHasGrades,
} = require('./encrypt-data');

function section(grades = {}) {
  return {
    grades: {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
      P: 0,
      NP: 0,
      W: 0,
      I: 0,
      ...grades,
    },
  };
}

test('removes zero-grade sections from a mixed course', () => {
  const gradedSection = section({ A: 3 });
  const course = { prefix: 'CSCE', number: '1010', sections: [section(), gradedSection] };

  const filteredCourse = courseWithGradedSections(course);

  assert.deepEqual(filteredCourse.sections, [gradedSection]);
  assert.notEqual(filteredCourse, course);
});

test('an all-zero course has no sections after filtering', () => {
  const filteredCourse = courseWithGradedSections({
    sections: [section(), section()],
  });

  assert.deepEqual(filteredCourse.sections, []);
});

test('retains sections with positive graded outcomes', () => {
  assert.equal(sectionHasGrades(section({ A: 3 })), true);
  assert.equal(sectionHasGrades(section({ W: 1 })), true);
  assert.equal(sectionHasGrades(section({ P: 2 })), true);
  assert.equal(sectionHasGrades(section({ NP: 2 })), true);
});

test('builds complete, unique instructor tokens without a cap', () => {
  const instructors = Array.from({ length: 82 }, (_, index) => ({
    instructor: { lastName: `Last ${index}`, firstName: `First ${index}` },
  }));
  const tokens = manifestTokensForCourse({
    prefix: 'CSCE',
    number: '1010',
    title: 'DATA, STRUCTURES',
    sections: [
      ...instructors,
      { instructor: { lastName: ' Last 1 ', firstName: ' First 1 ' } },
      { instructor: { lastName: 'Staff', firstName: '' } },
      { instructor: { lastName: '', firstName: 'Unknown' } },
    ],
  });

  assert.deepEqual(tokens.slice(0, 2), ['CSCE 1010', 'DATA, STRUCTURES']);
  assert.equal(tokens.length, 84);
  assert.equal(tokens.filter((token) => token === 'Last 1,First 1').length, 1);
  assert.equal(tokens.some((token) => token === 'Staff'), false);
  assert.equal(tokens.some((token) => token === ',Unknown'), false);
});

test('attaches SPOT ratings to the single matching graded section', () => {
  const spotIndex = buildSpotIndex([
    { YEAR: '2026', TERM: 'Spring', PREFIX: 'CSCE', NUMBER: '1010', SECTION: '1', RATING: '4.6', CEI: '', RESPONSES: '12', ENROLLED: '30', EVALUATION: '124624' },
    { YEAR: '2026', TERM: 'Spring', PREFIX: 'CSCE', NUMBER: '1010', SECTION: '2', RATING: '3.9', CEI: '5.1', RESPONSES: '8', ENROLLED: '20' },
    { YEAR: '2026', TERM: 'Spring', PREFIX: 'CSCE', NUMBER: '1010', SECTION: '3', RATING: '', CEI: '', RESPONSES: '0', ENROLLED: '9' },
  ]);
  const matched = { ...section({ A: 3 }), sectionNumber: '001', year: '2026', term: 'Spring' };
  const otherSemester = { ...section({ A: 3 }), sectionNumber: '001', year: '2025', term: 'Fall' };
  const splitA = { ...section({ A: 1 }), sectionNumber: '002', year: '2026', term: 'Spring' };
  const splitB = { ...section({ B: 1 }), sectionNumber: '002', year: '2026', term: 'Spring' };

  const attached = attachSpot(
    [{ prefix: 'CSCE', number: '1010', sections: [matched, otherSemester, splitA, splitB] }],
    spotIndex,
  );

  assert.equal(spotIndex.size, 2);
  assert.equal(attached, 1);
  assert.deepEqual(matched.spot, { rating: 4.6, cei: null, responses: 12, enrolled: 30, evaluation: '2026-spring-124624' });
  assert.equal(otherSemester.spot, undefined);
  assert.equal(splitA.spot, undefined);
  assert.equal(splitB.spot, undefined);
});
