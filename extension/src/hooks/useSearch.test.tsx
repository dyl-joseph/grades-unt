import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import type { ExtensionResponse, SearchResult } from "../lib/types";

test("keeps the latest search result when requests resolve out of order", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
  const window = dom.window;
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: window },
    document: { configurable: true, value: window.document },
    navigator: { configurable: true, value: window.navigator },
    HTMLElement: { configurable: true, value: window.HTMLElement },
    Node: { configurable: true, value: window.Node },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });

  const requests: Array<{ query: string; resolve: (response: ExtensionResponse) => void }> = [];
  const originalChrome = Reflect.get(globalThis, "chrome");
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        sendMessage: (message: { payload: { q: string } }) =>
          new Promise<ExtensionResponse>((resolve) => requests.push({ query: message.payload.q, resolve })),
      },
      storage: { local: { get: async () => ({ searchHistory: [] }), set: async () => undefined } },
    },
  });

  const [{ useSearch }, { createRoot }] = await Promise.all([
    import("./useSearch"),
    import("react-dom/client"),
  ]);
  let current: ReturnType<typeof useSearch> | undefined;
  function Probe() {
    current = useSearch();
    return createElement(
      "output",
      { "data-loading": String(current.loading) },
      current.results?.courses[0]?.prefix ?? "no results"
    );
  }

  const root = createRoot(document.getElementById("root")!);
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    if (originalChrome === undefined) Reflect.deleteProperty(globalThis, "chrome");
    else Object.defineProperty(globalThis, "chrome", { configurable: true, value: originalChrome });
  });

  async function waitForRequests(count: number) {
    const deadline = Date.now() + 2000;
    while (requests.length < count && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(requests.length, count);
  }

  function latestSearch() {
    assert.ok(current);
    return current;
  }

  const response = (prefix: string): SearchResult => ({
    courses: [{ id: 1, prefix, number: "1000", title: `${prefix} COURSE` }],
    instructors: [],
  });

  await act(async () => {
    root.render(createElement(Probe));
    await Promise.resolve();
  });
  await act(async () => {
    latestSearch().setQuery("math");
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  await waitForRequests(1);
  await act(async () => latestSearch().setQuery("biology"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  await waitForRequests(2);

  assert.deepEqual(requests.map((request) => request.query), ["math", "biology"]);
  await act(async () => requests[1].resolve({ ok: true, data: response("BIO") }));
  assert.equal(document.querySelector("output")?.textContent, "BIO");
  assert.equal(document.querySelector("output")?.getAttribute("data-loading"), "false");

  await act(async () => requests[0].resolve({ ok: true, data: response("MATH") }));
  assert.equal(document.querySelector("output")?.textContent, "BIO");

  await act(async () => latestSearch().setQuery("chemistry"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  assert.equal(requests[2]?.query, "chemistry");

  await act(async () => latestSearch().setQuery("math"));
  await act(async () => latestSearch().setQuery("chemistry"));
  assert.equal(requests[3]?.query, "chemistry");

  await act(async () => requests[2].resolve({ ok: true, data: response("CHEM") }));
  await act(async () => requests[3].resolve({ ok: true, data: response("CHEM") }));
  assert.equal(document.querySelector("output")?.textContent, "CHEM");
  assert.equal(document.querySelector("output")?.getAttribute("data-loading"), "false");
});
