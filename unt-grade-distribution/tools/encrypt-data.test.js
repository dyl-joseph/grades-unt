const test = require('node:test');
const assert = require('node:assert/strict');

const {
  courseWithGradedSections,
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
