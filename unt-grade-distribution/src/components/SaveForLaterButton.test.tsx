import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import SaveForLaterButton from "./SaveForLaterButton";
import { SavedCoursesProvider } from "../context/SavedCoursesContext";
import type { CartItem } from "../lib/types";

const item: CartItem = {
  courseId: 1, prefix: "ACCT", number: "2010", title: "Principles", gpa: 3,
  gradeA: 1, gradeB: 1, gradeC: 1, gradeD: 0, gradeF: 0, gradeP: 0, gradeNP: 0,
  gradeW: 0, gradeI: 0, totalEnroll: 3, sectionCount: 1,
};

test("first-save feedback only appears for a new empty shortlist and can be dismissed", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    self: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    localStorage: { configurable: true, value: dom.window.localStorage },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.getElementById("root")!);
  const render = () => createElement(SavedCoursesProvider, null,
    createElement(SaveForLaterButton, { item }),
    createElement(SaveForLaterButton, { item: { ...item, courseId: 2 } }));
  try {
    await act(async () => root.render(render()));
    assert.equal(document.querySelector('[role="status"]'), null);
    await act(async () => (document.querySelector('[aria-label="Save bookmark"]') as HTMLButtonElement).click());
    assert.match(document.querySelector('[role="status"]')!.textContent!, /Your semester is taking shape/);
    await act(async () => (document.querySelector('[aria-label="Dismiss saved-course message"]') as HTMLButtonElement).click());
    await act(async () => (document.querySelector('[aria-label="Save bookmark"]') as HTMLButtonElement).click());
    assert.equal(document.querySelector('[role="status"]'), null);
    // Rehydrate an existing shortlist: loading saved courses is not a new save.
    await act(async () => root.render(null));
    await act(async () => root.render(render()));
    assert.equal(document.querySelectorAll('[aria-label="Remove bookmark"]').length, 2);
    assert.equal(document.querySelector('[role="status"]'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
