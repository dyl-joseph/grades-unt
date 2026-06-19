import assert from "node:assert/strict";
import test from "node:test";
import { loadCourseByCode } from "./encryptedData";

test("loadCourseByCode falls back to the course API when manifest data is unavailable", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url === "/encrypted/manifest.json") {
      return Response.json([]);
    }

    if (url === "/api/course/MATH/1650") {
      return Response.json({
        course: { prefix: "MATH", number: "1650", title: "PRE-CALCULUS" },
        sections: [
          {
            sectionNumber: "001",
            year: 2025,
            term: "Fall",
            gradeA: 10,
            gradeB: 8,
            gradeC: 4,
            gradeD: 1,
            gradeF: 0,
            gradeP: null,
            gradeNP: null,
            gradeW: 2,
            gradeI: null,
            instructor: { firstName: "Ada", lastName: "Lovelace" },
          },
        ],
      });
    }

    return new Response(null, { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const course = await loadCourseByCode("MATH", "1650");

  assert.deepEqual(calls, ["/encrypted/manifest.json", "/api/course/MATH/1650"]);
  assert.equal(course?.title, "PRE-CALCULUS");
  assert.equal(course?.sections[0].year, "2025");
  assert.deepEqual(course?.sections[0].instructor, { firstName: "Ada", lastName: "Lovelace" });
  assert.deepEqual(course?.sections[0].grades, {
    A: 10,
    B: 8,
    C: 4,
    D: 1,
    F: 0,
    P: 0,
    NP: 0,
    W: 2,
    I: 0,
  });
});
