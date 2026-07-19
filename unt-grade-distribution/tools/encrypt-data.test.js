const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
