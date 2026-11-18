import assert from "node:assert/strict";
import test from "node:test";
import { aggregateSpot, spotDescription } from "./spot";

test("aggregateSpot weights section ratings by responses", () => {
  assert.deepEqual(
    aggregateSpot([
      { spot: { rating: 5, cei: 6, responses: 10, enrolled: 20 } },
      { spot: { rating: 3, cei: null, responses: 30, enrolled: 40 } },
      { spot: null },
      {},
    ]),
    { rating: 3.5, cei: 6, responses: 40, sections: 2 }
  );
});

test("aggregateSpot counts a cross-listed evaluation once", () => {
  const shared = { rating: 5, cei: null, responses: 10, enrolled: 12, evaluation: "2026-spring-7" };
  assert.deepEqual(
    aggregateSpot([
      { spot: shared },
      { spot: { ...shared } },
      { spot: { rating: 3, cei: null, responses: 10, enrolled: 15, evaluation: "2026-spring-8" } },
    ]),
    { rating: 4, cei: null, responses: 20, sections: 2 }
  );
});

test("aggregateSpot returns null when no section has a rating", () => {
  assert.equal(aggregateSpot([{}, { spot: null }]), null);
  assert.equal(aggregateSpot([{ spot: { rating: 4, cei: null, responses: 0, enrolled: 5 } }]), null);
});

test("spotDescription states both scales and the response count", () => {
  assert.equal(
    spotDescription({ rating: 4.5, cei: 5, responses: 1 }),
    "Student Perceptions of Teaching (SPOT) overall rating 4.5 out of 5, 1 response, challenge and engagement 5.0 out of 7"
  );
});
