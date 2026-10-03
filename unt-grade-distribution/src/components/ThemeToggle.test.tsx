import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";

test("system theme wins over stale storage and live changes reset manual toggles", async () => {
  for (const initialDark of [true, false]) {
    const dom = new JSDOM("<html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });
    const globals = {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      HTMLElement: dom.window.HTMLElement,
      Node: dom.window.Node,
      MutationObserver: dom.window.MutationObserver,
      IS_REACT_ACT_ENVIRONMENT: true,
    };
    const originals = Object.fromEntries(
      Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
    );
    for (const [key, value] of Object.entries(globals)) {
      Object.defineProperty(globalThis, key, { configurable: true, value });
    }

    let dark = initialDark;
    const preference = new dom.window.EventTarget();
    Object.defineProperty(preference, "matches", { get: () => dark });
    dom.window.matchMedia = () => preference as unknown as MediaQueryList;
    dom.window.localStorage.setItem("theme", initialDark ? "light" : "dark");
    const { createRoot } = await import("react-dom/client");
    const { default: ThemeToggle } = await import("./ThemeToggle");
    const root = createRoot(dom.window.document.getElementById("root")!);

    try {
      await act(async () => root.render(createElement(ThemeToggle)));
      await act(async () => new Promise(resolve => setTimeout(resolve, 20)));
      assert.equal(dom.window.document.documentElement.classList.contains("dark"), initialDark);
      const button = dom.window.document.querySelector("button")!;
      assert.equal(button.getAttribute("aria-label"), initialDark ? "Switch to light mode" : "Switch to dark mode");

      await act(async () => button.click());
      assert.equal(dom.window.document.documentElement.classList.contains("dark"), !initialDark);
      assert.equal(dom.window.localStorage.getItem("theme"), initialDark ? "light" : "dark");

      for (const next of [!initialDark, initialDark]) {
        await act(async () => {
          dark = next;
          preference.dispatchEvent(new dom.window.Event("change"));
        });
        assert.equal(dom.window.document.documentElement.classList.contains("dark"), next);
        assert.equal(button.getAttribute("aria-label"), next ? "Switch to light mode" : "Switch to dark mode");
      }

      await act(async () => root.unmount());
      dark = !initialDark;
      preference.dispatchEvent(new dom.window.Event("change"));
      assert.equal(dom.window.document.documentElement.classList.contains("dark"), initialDark);
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
      for (const key of Object.keys(globals)) {
        const original = originals[key];
        if (original) Object.defineProperty(globalThis, key, original);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  }
});
