import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

test("encrypted blob assets are immutable while the manifest revalidates", async () => {
  assert.ok(nextConfig.headers);
  const headers = await nextConfig.headers();
  const blobRule = headers.find((rule) => rule.source === "/encrypted/blobs/:path*");
  const manifestRule = headers.find((rule) => rule.source === "/encrypted/manifest.json");

  assert.deepEqual(blobRule?.headers, [
    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
  ]);
  assert.deepEqual(manifestRule?.headers, [
    { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
  ]);
});
