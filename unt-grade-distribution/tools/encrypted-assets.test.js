import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const publicDirectory = path.resolve("public");
const encryptedDirectory = path.join(publicDirectory, "encrypted");
const blobsDirectory = path.join(encryptedDirectory, "blobs");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertMetadata(metadata, metadataFile) {
  assert.equal(
    typeof metadata,
    "object",
    `${metadataFile} must contain a JSON object`,
  );
  assert.notEqual(metadata, null, `${metadataFile} must contain a JSON object`);
  assert.equal(
    typeof metadata.iv,
    "string",
    `${metadataFile} must contain an iv string`,
  );
  assert.ok(metadata.iv.length > 0, `${metadataFile} must contain a non-empty iv`);
  assert.equal(
    typeof metadata.salt,
    "string",
    `${metadataFile} must contain a salt string`,
  );
  assert.ok(
    metadata.salt.length > 0,
    `${metadataFile} must contain a non-empty salt`,
  );
  assert.equal(
    Number.isInteger(metadata.iterations),
    true,
    `${metadataFile} must contain integer iterations`,
  );
  assert.ok(
    metadata.iterations > 0,
    `${metadataFile} iterations must be positive`,
  );
}

function normalizedInstructorToken(token) {
  if (typeof token !== "string") return null;
  const commaIndex = token.indexOf(",");
  if (commaIndex <= 0 || commaIndex === token.length - 1) return null;

  const lastName = token.slice(0, commaIndex).normalize("NFKC").trim().replace(/\s+/g, " ");
  const firstName = token.slice(commaIndex + 1).normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!lastName || !firstName) return null;
  return `${lastName},${firstName}`.toLowerCase();
}

test("encrypted manifest and static assets stay in sync", async () => {
  const manifestPath = path.join(encryptedDirectory, "manifest.json");
  const manifest = await readJson(manifestPath);

  assert.equal(Array.isArray(manifest), true, "manifest must be an array");
  assert.ok(manifest.length > 0, "manifest must contain at least one entry");

  const ids = manifest.map((entry, index) => {
    assert.equal(
      typeof entry?.id,
      "string",
      `manifest entry ${index} must contain an id string`,
    );
    assert.match(entry.id, /^[^/]+\.bin$/, `invalid manifest id: ${entry.id}`);
    return entry.id;
  });
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, "manifest ids must be unique");

  const expectedFiles = new Set();
  for (const id of ids) {
    const metadataFile = id.replace(/\.bin$/, ".meta.json");
    expectedFiles.add(id);
    expectedFiles.add(metadataFile);
    assertMetadata(
      await readJson(path.join(blobsDirectory, metadataFile)),
      metadataFile,
    );
    await readFile(path.join(blobsDirectory, id));
  }

  const actualFiles = new Set(await readdir(blobsDirectory));
  assert.deepEqual(
    [...actualFiles].sort(),
    [...expectedFiles].sort(),
    "blob directory must contain exactly one blob and metadata file per manifest entry",
  );
});

test("current instructor fan-out remains exact and bounded", async () => {
  const manifest = await readJson(path.join(encryptedDirectory, "manifest.json"));
  const { findInstructorEntries } = await import("../src/lib/encryptedData.ts");
  const heEntries = findInstructorEntries(manifest, "Yanyan", "He");

  assert.equal(heEntries.length, 2, "He,Yanyan must select exactly two current course entries");
  assert.ok(
    heEntries.every((entry) => entry.tokens.slice(2).includes("He,Yanyan")),
    "every selected He,Yanyan entry must carry its exact full instructor token",
  );
  assert.equal(heEntries.length * 2, 4, "He,Yanyan must require only two blob/meta pairs");

  const entriesByInstructor = new Map();
  for (const entry of manifest) {
    const namesInEntry = new Set(
      entry.tokens.slice(2).map(normalizedInstructorToken).filter(Boolean),
    );
    for (const name of namesInEntry) {
      const entries = entriesByInstructor.get(name) || new Set();
      entries.add(entry.id);
      entriesByInstructor.set(name, entries);
    }
  }

  const worstCaseAssetRequests = Math.max(
    ...Array.from(entriesByInstructor.values(), (entries) => entries.size * 2),
  );
  assert.ok(worstCaseAssetRequests < 100, `worst current instructor fan-out is ${worstCaseAssetRequests} asset requests`);
});
