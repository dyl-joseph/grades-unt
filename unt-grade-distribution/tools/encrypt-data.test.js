const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildHomeStats,
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

function course(prefix, number, grades, title = `${prefix} ${number}`) {
  return { prefix, number, title, sections: [section(grades)] };
}

test('home stats rank intro courses by GPA and ignore small or upper-level courses', () => {
  const stats = buildHomeStats(
    [
      course('AAAA', '1010', { A: 90, B: 10, W: 10 }),
      course('BBBB', '2020', { C: 60, D: 20, F: 20 }),
      course('CCCC', '1030', { A: 5 }),
      course('DDDD', '4000', { F: 500 }),
      course('EEEE', '1050', { P: 400 }),
    ],
    100,
    2,
  );

  assert.deepEqual(stats.easiest.map((c) => c.prefix), ['AAAA', 'BBBB']);
  assert.deepEqual(stats.hardest.map((c) => c.prefix), ['BBBB', 'AAAA']);
  assert.deepEqual(stats.easiest[0], {
    prefix: 'AAAA',
    number: '1010',
    title: 'AAAA 1010',
    gpa: 3.9,
    dfwRate: 9.1,
    students: 110,
    dist: [81.8, 9.1, 0, 0, 0, 9.1],
  });
});

test('home stats compute department GPA from letter grades only', () => {
  const { departments } = buildHomeStats([
    course('AAAA', '1010', { A: 1, C: 1, W: 8 }),
    course('AAAA', '4000', { B: 2 }),
    course('PPPP', '1010', { P: 30 }),
  ]);

  assert.deepEqual(departments.AAAA, {
    avgGpa: 3,
    students: 12,
    dist: [8.3, 16.7, 8.3, 0, 0, 66.7],
  });
  assert.deepEqual(departments.PPPP, { avgGpa: null, students: 30 });
});
