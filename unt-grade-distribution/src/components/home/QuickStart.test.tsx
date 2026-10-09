import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import QuickStart from "./QuickStart";

test("Surprise me recovers from fetch failure and navigates to a real manifest course", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    self: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.getElementById("root")!);
  const pushes: string[] = [];
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, replace() {}, prefetch() {},
    push: (url) => { pushes.push(url); },
  };
  const originalFetch = globalThis.fetch;
  const originalRandom = Math.random;
  let calls = 0;
  const entry = (prefix: string, number: string) => ({
    id: `${prefix}${number}.bin`, tokens: [], preview: { prefix, number, title: "A class" },
  });
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1 ? new Response(null, { status: 503 })
      : Response.json([entry("ACCT", "2010"), entry("CSCE", "1030"), entry("ACCT", "2010")]);
  };
  Math.random = () => 0.99;
  try {
    await act(async () => root.render(createElement(AppRouterContext.Provider, { value: router }, createElement(QuickStart))));
    const button = document.querySelector("button")!;
    await act(async () => button.click());
    assert.match(document.querySelector('[role="status"]')!.textContent!, /Couldn't pick a class/);
    assert.equal(button.disabled, false);
    assert.deepEqual(pushes, []);
    await act(async () => button.click());
    assert.deepEqual(pushes, ["/course/CSCE/1030"]);
    assert.equal(document.querySelector('[role="status"]')!.textContent, "");
    assert.equal(calls, 2);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    Math.random = originalRandom;
    dom.window.close();
  }
});
