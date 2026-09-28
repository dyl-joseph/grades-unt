import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));

test("declares the production API host for service worker requests", () => {
  assert.deepEqual(manifest.host_permissions, ["https://www.untgrades.app/*"]);
});
