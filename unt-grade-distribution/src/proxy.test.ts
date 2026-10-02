// Mirror the Next server bootstrap before importing its matcher test utilities.
import "next/dist/server/node-environment-baseline";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";
import { NO_STORE_HEADERS } from "./lib/rate-limit";

function configure(t: TestContext, overrides: Record<string, string | undefined> = {}) {
  const keys = new Set([...Object.keys(process.env).filter((key) => key.startsWith("RATE_LIMIT_")),
    "NODE_ENV", "VERCEL", "CHROME_EXTENSION_ID", "DATABASE_URL", "DIRECT_URL",
    "RATE_LIMIT_REDIS_REST_URL", "RATE_LIMIT_REDIS_REST_TOKEN", ...Object.keys(overrides)]);
  const before = Object.fromEntries([...keys].map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, {
    NODE_ENV: "production", VERCEL: "1", RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test",
    RATE_LIMIT_REDIS_REST_TOKEN: "test-token", DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci",
    DIRECT_URL: "postgresql://ci:ci@localhost:5432/ci",
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const key of keys) delete process.env[key];
    for (const [key, value] of Object.entries(before)) if (value !== undefined) process.env[key] = value;
  });
}

const makeRequest = (path: string, init: RequestInit = {}) => new NextRequest(`https://untgrades.app${path}`, {
  ...init,
  signal: init.signal ?? undefined,
  headers: { "x-vercel-forwarded-for": "203.0.113.7", ...Object.fromEntries(new Headers(init.headers)) },
});

function assertUncacheable(response: Response) {
  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) assert.equal(response.headers.get(name), value);
}

test("Next matcher intercepts every API and encrypted manifest/blob/metadata route", () => {
  for (const path of [
    "/api", "/api/search", "/api/search/?q=CS1010", "/api/course/CS/1010", "/api/instructor/42",
    "/api/search-log", "/api/search-log/", "/api/mcp", "/api/mcp/", "/api/mcp/subpath",
    "/encrypted", "/encrypted/manifest.json", "/encrypted/manifest.json?v=2",
    "/encrypted/blobs/file.bin", "/encrypted/blobs/file.meta.json",
    "/%65ncrypted/manifest.json", "/encrypted/%6danifest.json", "/encrypted%2fblobs/file.bin",
    "/%61pi/mcp", "/api%2fmcp", "/api/%73earch",
  ]) assert.equal(unstable_doesMiddlewareMatch({ config, url: `https://untgrades.app${path}` }), true, path);
  for (const path of ["/", "/about", "/_next/static/chunk.js", "/apiary", "/encrypted-other/file.bin"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, url: `https://untgrades.app${path}` }), false, path);
  }
});

test("OPTIONS preflights perform no fetch and cannot charge the next real request", async (t) => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ result: [1, 0, 0] }));
  for (const path of ["/api/search", "/api/search-log", "/api/mcp", "/encrypted/manifest.json", "/encrypted/blobs/file.bin"]) {
    const response = await proxy(makeRequest(path, { method: "OPTIONS", headers: { origin: "https://untgrades.app" } }));
    assert.equal(response.status, 204, path);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.has("x-ratelimit-remaining"), false);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://untgrades.app");
  }
  assert.equal(fetchMock.mock.callCount(), 0);
  const response = await proxy(makeRequest("/api/search?q=CS1010"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("x-ratelimit-remaining"), "0");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("preflight succeeds without production identity/store configuration", async (t) => {
  configure(t, { RATE_LIMIT_REDIS_REST_URL: undefined, RATE_LIMIT_REDIS_REST_TOKEN: undefined });
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not fetch"); });
  const response = await proxy(new NextRequest("https://untgrades.app/api/search", { method: "OPTIONS" }));
  assert.equal(response.status, 204);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("MCP preflight preserves protocol/session headers and DELETE support", async (t) => {
  configure(t);
  const response = await proxy(makeRequest("/api/mcp", { method: "OPTIONS", headers: { origin: "https://untgrades.app" } }));
  assert.match(response.headers.get("access-control-allow-methods")!, /DELETE/);
  for (const header of ["MCP-Protocol-Version", "MCP-Session-Id", "Last-Event-ID"]) {
    assert.ok(response.headers.get("access-control-allow-headers")!.includes(header));
  }
  for (const header of ["Retry-After", "X-RateLimit-Remaining", "MCP-Session-Id"]) {
    assert.ok(response.headers.get("access-control-expose-headers")!.includes(header));
  }
});

test("static manifest, binary and metadata responses are checked before the file handler", async (t) => {
  configure(t);
  const calls: unknown[][] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return Response.json({ result: [0, 0, 60_001] });
  });
  for (const path of ["/encrypted/manifest.json", "/encrypted/blobs/course.bin", "/encrypted/blobs/course.meta.json"]) {
    const response = await proxy(makeRequest(path));
    assert.equal(response.status, 429, path);
    assert.equal(response.headers.get("retry-after"), "61");
    assert.equal(response.headers.has("x-middleware-next"), false);
    assertUncacheable(response);
  }
  assert.equal(calls.length, 3);
  assert.match(String(calls[0][3]), /:manifest:minute$/);
  assert.match(String(calls[1][3]), /:data:minute$/);
  assert.equal(calls[1][3], calls[2][3]);
});

test("percent-encoded static and API aliases are charged against canonical quota keys", async (t) => {
  configure(t);
  const calls: unknown[][] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return Response.json({ result: [0, 0, 1000] });
  });
  for (const paths of [
    ["/encrypted/manifest.json", "/%65ncrypted/manifest.json", "/encrypted/%6danifest.json?v=2"],
    ["/encrypted/blobs/course.bin", "/%65ncrypted/blobs/course.bin", "/encrypted%2fblobs/course.meta.json"],
    ["/api/mcp", "/%61pi/mcp", "/api%2fmcp"],
  ]) {
    const before = calls.length;
    for (const path of paths) {
      const response = await proxy(makeRequest(path));
      assert.equal(response.status, 429, path);
      assert.equal(response.headers.has("x-middleware-next"), false, path);
      assertUncacheable(response);
    }
    assert.equal(calls.length, before + paths.length);
    assert.deepEqual(calls[before], calls[before + 1]);
    assert.deepEqual(calls[before], calls[before + 2]);
  }
});

test("429 API responses retain approved CORS and expose Retry-After without caching", async (t) => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ result: [0, 0, 1500] }));
  for (const origin of ["https://untgrades.app", "https://www.untgrades.app"]) {
    const response = await proxy(makeRequest("/api/search?q=CS1010", { headers: { origin } }));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "2");
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(response.headers.get("vary"), "Origin");
    assert.match(response.headers.get("access-control-expose-headers")!, /Retry-After/);
    assertUncacheable(response);
  }
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("missing/forged Origin and client already-checked headers do not bypass protection", async (t) => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ result: [0, 0, 1000] }));
  const attempts: Record<string, string>[] = [{}, { origin: "https://attacker.test" }, {
    origin: "https://untgrades.app", "x-rate-limit-checked": "true", "x-ratelimit-checked": "1",
    "x-forwarded-for": "198.51.100.9", "x-real-ip": "198.51.100.9", "x-install-id": "rotated",
  }];
  for (const headers of attempts) {
    const response = await proxy(makeRequest("/api/search", { headers }));
    assert.equal(response.status, 429);
    if (headers.origin !== "https://untgrades.app") assert.equal(response.headers.has("access-control-allow-origin"), false);
  }
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("missing trusted Vercel IP fails closed before any Redis request", async (t) => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ result: [1, 10, 0] }));
  const response = await proxy(new NextRequest("https://untgrades.app/api/search", {
    headers: { "x-forwarded-for": "203.0.113.7", "x-real-ip": "203.0.113.7", origin: "https://untgrades.app" },
  }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(response.headers.get("access-control-allow-origin"), "https://untgrades.app");
  assertUncacheable(response);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("missing production store configuration returns uncacheable 503 for API and static data", async (t) => {
  configure(t, { RATE_LIMIT_REDIS_REST_URL: undefined, RATE_LIMIT_REDIS_REST_TOKEN: undefined });
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not fetch"); });
  for (const path of ["/api/search", "/api/mcp", "/encrypted/manifest.json", "/encrypted/blobs/course.bin"]) {
    const response = await proxy(makeRequest(path));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "30");
    assertUncacheable(response);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("Redis failure and malformed responses are never forwarded to protected handlers", async (t) => {
  for (const failure of ["network", "http", "malformed"] as const) {
    await t.test(failure, async (t) => {
      configure(t);
      t.mock.method(globalThis, "fetch", async () => {
        if (failure === "network") throw new Error("secret redis-token");
        if (failure === "http") return new Response("redis-token", { status: 503 });
        return Response.json({ result: [1, "100", 0] });
      });
      const response = await proxy(makeRequest("/api/search"));
      assert.equal(response.status, 503);
      assert.equal(response.headers.has("x-middleware-next"), false);
      assertUncacheable(response);
      assert.doesNotMatch(await response.text(), /redis-token|secret/);
    });
  }
});

test("all route handlers leave enforcement to proxy, with exactly one charge per request", async (t) => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ result: [1, 10, 0] }));
  const search = await import("./app/api/search/route");
  const course = await import("./app/api/course/[prefix]/[number]/route");
  const instructor = await import("./app/api/instructor/[id]/route");
  const log = await import("./app/api/search-log/route");
  const mcp = await import("./app/api/mcp/route");
  const cases: { path: string; init?: RequestInit; run: (request: NextRequest) => Promise<Response> }[] = [
    { path: "/api/search?q=a", run: (request) => search.GET(request) },
    { path: "/api/course/CS/1010", run: (request) => course.GET(request, { params: Promise.resolve({}) }) },
    { path: "/api/instructor/not-a-number", run: (request) => instructor.GET(request, { params: Promise.resolve({ id: "not-a-number" }) }) },
    { path: "/api/search-log", init: { method: "POST", body: '{"searchKind":"course"}' }, run: (request) => log.POST(request) },
    { path: "/api/mcp", init: { method: "POST", body: "[]" }, run: (request) => mcp.POST(request) },
  ];
  for (const entry of cases) {
    const before = fetchMock.mock.callCount();
    assert.equal((await proxy(makeRequest(entry.path, entry.init))).status, 200);
    assert.equal(fetchMock.mock.callCount(), before + 1);
    const response = await entry.run(makeRequest(entry.path, entry.init));
    assert.equal(response.status, entry.path.startsWith("/api/search?") ? 200 : 400, entry.path);
    assert.equal(response.headers.has("x-ratelimit-remaining"), false, entry.path);
    assert.equal(fetchMock.mock.callCount(), before + 1, `${entry.path} must not charge again`);
  }
  // Also guard paths that short-circuit before their main handler work above.
  for (const route of ["search", "course/[prefix]/[number]", "instructor/[id]", "search-log", "mcp"]) {
    const source = await readFile(new URL(`./app/api/${route}/route.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /checkRequestLimit|(?:from\s*["'][^"']*rate-limit)|(?:\.consume\s*\()/, route);
  }
});
