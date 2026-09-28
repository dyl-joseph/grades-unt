import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, useState } from "react";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

test("changing the query cannot select suggestions from the previous query", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost",
  });
  const window = dom.window;
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: window },
    document: { configurable: true, value: window.document },
    navigator: { configurable: true, value: window.navigator },
    HTMLElement: { configurable: true, value: window.HTMLElement },
    Node: { configurable: true, value: window.Node },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });

  const pushes: string[] = [];
  const router: AppRouterInstance = {
    back() {},
    forward() {},
    refresh() {},
    push: (path) => pushes.push(path),
    replace() {},
    prefetch() {},
  };

  const manifest = [
    {
      id: "acct-2010.bin",
      tokens: ["ACCT 2010", "PRINCIPLES OF ACCOUNTING", "Doe,Jane"],
      preview: { prefix: "ACCT", number: "2010", title: "PRINCIPLES OF ACCOUNTING" },
    },
    {
      id: "csce-1030.bin",
      tokens: ["CSCE 1030", "COMPUTER SCIENCE I"],
      preview: { prefix: "CSCE", number: "1030", title: "COMPUTER SCIENCE I" },
    },
  ];
  const searchLogRequests: Array<RequestInit | undefined> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/search-log") {
      searchLogRequests.push(init);
      return new Response(null, { status: 204 });
    }
    return Response.json(manifest);
  };

  const [{ default: SearchBar }, { createRoot }] = await Promise.all([
    import("./SearchBar"),
    import("react-dom/client"),
  ]);
  const root = createRoot(document.getElementById("root")!);
  function SearchBarHarness() {
    const [pathname, setPathname] = useState("/");
    return createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(
        PathnameContext.Provider,
        { value: pathname },
        createElement("button", {
          id: "change-path",
          onClick: () => setPathname("/course/ACCT/2010"),
        }),
        createElement(SearchBar)
      )
    );
  }
  t.after(async () => {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
  });

  await act(async () => {
    root.render(createElement(SearchBarHarness));
    await Promise.resolve();
  });

  const input = document.querySelector("input")!;
  const setInputValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  const changeQuery = (value: string) => {
    setInputValue.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  };

  await act(async () => {
    changeQuery("ACCT 2010");
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  assert.match(document.body.textContent ?? "", /ACCT 2010/);

  await act(async () => {
    changeQuery("CSCE 1030");
  });
  assert.doesNotMatch(document.body.textContent ?? "", /ACCT 2010/);

  await act(async () => {
    input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  assert.deepEqual(pushes, []);

  await act(async () => {
    changeQuery("Jane");
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  const instructorButton = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Doe, Jane")
  );
  assert.ok(instructorButton);
  await act(async () => instructorButton.click());

  const searchLogBody = JSON.parse(String(searchLogRequests[0]?.body));
  assert.equal(searchLogBody.searchKind, "instructor");
  assert.equal(searchLogBody.rawQuery, undefined);
  assert.doesNotMatch(JSON.stringify(searchLogBody), /Jane|Doe/);

  await act(async () => {
    changeQuery("ACCT 2010");
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  assert.match(document.body.textContent ?? "", /ACCT 2010/);
  await act(async () => document.getElementById("change-path")!.click());
  assert.doesNotMatch(document.body.textContent ?? "", /ACCT 2010/);

  await act(async () => changeQuery("CSCE 1030"));
  await act(async () => changeQuery("ACCT 2010"));
  assert.match(document.body.textContent ?? "", /ACCT 2010/);
  assert.equal(input.getAttribute("aria-busy"), "false");
});
