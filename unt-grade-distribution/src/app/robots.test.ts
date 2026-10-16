import assert from "node:assert/strict";
import test from "node:test";
import robots from "./robots";

test("robots.txt points to the www sitemap and keeps rendering paths crawlable", () => {
  const { rules, sitemap } = robots();
  const disallowed = [rules].flat().flatMap((rule) => [rule.disallow ?? []].flat());

  assert.equal(sitemap, "https://www.untgrades.app/sitemap.xml");
  assert.deepEqual(disallowed, ["/api/"]);
  for (const path of ["/", "/cart", "/encrypted/manifest.json", "/course/CSCE/1030"]) {
    assert.ok(!disallowed.some((prefix) => path.startsWith(prefix)), path);
  }
});
