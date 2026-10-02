import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedJson, RequestBodyError } from "./request-body";

function request(body: string, headers?: Record<string, string>) {
  return new Request("https://example.test/api/mcp", { method: "POST", body, headers });
}

test("bounded JSON accepts a body at the exact byte limit", async () => {
  assert.deepEqual(await readBoundedJson(request('{"x":1}'), 7), { x: 1 });
});

test("bounded JSON checks actual UTF-8 bytes even with a false Content-Length", async () => {
  await assert.rejects(readBoundedJson(request('"éé"', { "content-length": "1" }), 5),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413);
});

test("bounded JSON rejects oversized declared length without reading bytes", async () => {
  await assert.rejects(readBoundedJson(request("{}", { "content-length": "100" }), 10),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413);
});

test("bounded JSON rejects malformed or empty requests", async () => {
  for (const body of ["", "{", "undefined"]) {
    await assert.rejects(readBoundedJson(request(body), 100),
      (error: unknown) => error instanceof RequestBodyError && error.status === 400);
  }
});

test("bounded JSON cancels a stalled stream at the deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const streamed = new Request("https://example.test/api/mcp", Object.assign(
    { method: "POST", body }, { duplex: "half" },
  ));
  const pending = readBoundedJson(streamed, 100);
  t.mock.timers.tick(5_000);
  await assert.rejects(pending, (error: unknown) => error instanceof RequestBodyError && error.status === 408);
  assert.equal(cancelled, true);
});
