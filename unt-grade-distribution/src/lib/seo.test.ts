import assert from "node:assert/strict";
import test from "node:test";
import { courseMetadata, instructorMetadata, pageMetadata, readManifest, sitemapPaths } from "./seo";

test("pageMetadata sets matching title, description, canonical, and Open Graph tags", () => {
  const metadata = pageMetadata({ title: "Terms | UNT Grades", description: "Terms.", path: "/terms" });

  assert.deepEqual(metadata.title, { absolute: "Terms | UNT Grades" });
  assert.equal(metadata.description, "Terms.");
  assert.deepEqual(metadata.alternates, { canonical: "/terms" });
  assert.deepEqual(metadata.openGraph, {
    title: "Terms | UNT Grades",
    description: "Terms.",
    url: "/terms",
    type: "website",
    siteName: "UNT Grades",
  });
  assert.equal(metadata.robots, undefined);
});

test("pageMetadata adds noindex, follow only when asked", () => {
  const metadata = pageMetadata({ title: "t", description: "d", path: "/cart", noindex: true });
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("courseMetadata uses the manifest's course code for the title and canonical", async () => {
  const metadata = await courseMetadata("csce", "1030");

  assert.deepEqual(metadata.title, { absolute: "CSCE 1030 Grade Distribution | UNT Grades" });
  assert.deepEqual(metadata.alternates, { canonical: "/course/CSCE/1030" });
  assert.match(String(metadata.description), /CSCE 1030/);
});

test("instructorMetadata canonicalizes to the manifest's spelling", async () => {
  const metadata = await instructorMetadata(encodeURIComponent("mpofu,elias"));

  assert.deepEqual(metadata.title, { absolute: "Elias Mpofu Grade Distribution | UNT Grades" });
  assert.deepEqual(metadata.alternates, { canonical: "/instructor/Mpofu%2CElias" });
});

test("sitemapPaths lists home, terms, and every course and instructor once", async () => {
  const paths = await sitemapPaths();
  const manifest = await readManifest();
  const courseCount = new Set(manifest.map(({ preview }) => `${preview.prefix} ${preview.number}`)).size;

  assert.deepEqual(paths.slice(0, 2), ["/", "/terms"]);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(paths.filter((path) => path.startsWith("/course/")).length, courseCount);
  assert.ok(paths.includes("/course/CSCE/1030"));
  assert.ok(paths.includes("/instructor/Mpofu%2CElias"));
  assert.ok(paths.every((path) => !path.includes("?") && (path === "/" || !path.endsWith("/"))));
});
