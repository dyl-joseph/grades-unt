import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";

test("recovers when a lazy detail screen fails to load", async (t) => {
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

  const errors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (message) => errors.push(String(message));
  const [{ default: DetailErrorBoundary }, { createRoot }] = await Promise.all([
    import("./DetailErrorBoundary"),
    import("react-dom/client"),
  ]);
  const actions: string[] = [];
  const root = createRoot(document.getElementById("root")!);
  t.after(async () => {
    await act(async () => root.unmount());
    console.error = originalConsoleError;
    dom.window.close();
  });

  function FailedScreen(): never {
    throw new Error("chunk load failed");
  }

  await act(async () => {
    root.render(
      createElement(
        DetailErrorBoundary,
        {
          onBack: () => {
            actions.push("back");
          },
          onReload: () => {
            actions.push("reload");
          },
        },
        createElement(FailedScreen)
      )
    );
  });

  assert.match(
    document.querySelector('[role="alert"]')?.textContent ?? "",
    /Could not load this screen/
  );
  const buttons = Array.from(document.querySelectorAll("button"));
  assert.deepEqual(buttons.map((button) => button.textContent), ["Back to search", "Reload extension"]);

  await act(async () => buttons[0].click());
  await act(async () => buttons[1].click());
  assert.deepEqual(actions, ["back", "reload"]);
  assert.ok(errors.length > 0);
});
