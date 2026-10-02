import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertVercelRateLimitConfiguration, checkRequestLimit, clientIdentity, CONSUME_SCRIPT, limitGroup, MemoryLimitStore,
  NO_STORE_HEADERS, normalizeClientIp, RedisLimitStore, requestBuckets,
  type Bucket, type LimitStore,
} from "./rate-limit";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const production = { NODE_ENV: "production", VERCEL: "1" };
const clientHeaders = (extra: HeadersInit = {}) => new Headers({
  "x-vercel-forwarded-for": "203.0.113.7", ...Object.fromEntries(new Headers(extra)),
});
const request = (path = "/api/search", extra: HeadersInit = {}, method = "GET") =>
  new Request(`https://example.test${path}`, { headers: clientHeaders(extra), method });
const bucket = (key: string, limit: number, windowMs = MINUTE): Bucket => ({ key, limit, windowMs });

function assertUncacheable(response: Response) {
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) assert.equal(response.headers.get(key), value);
}

// A deterministic Redis REST contract double. Every EVAL executes synchronously
// against one shared server clock/map; separate clients cannot split its budget.
// This checks the REST protocol and cross-instance behavior, not a live Redis Lua VM.
function redisBackend() {
  const entries = new Map<string, { count: number; expires: number }>();
  let now = 0;
  let calls = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    calls++;
    const command: unknown[] = JSON.parse(String(init?.body));
    assert.equal(command[0], "EVAL");
    assert.equal(command[1], CONSUME_SCRIPT);
    const count = Number(command[2]);
    const keys = command.slice(3, 3 + count).map(String);
    const values = command.slice(3 + count).map(Number);
    assert.equal(values.length, 2 * count);
    for (const [key, entry] of entries) if (entry.expires <= now) entries.delete(key);
    let retry = 0;
    for (let i = 0; i < keys.length; i++) {
      const entry = entries.get(keys[i]);
      if (entry && entry.count >= values[2 * i]) retry = Math.max(retry, entry.expires - now);
    }
    if (retry) return Response.json({ result: [0, 0, retry] });
    let remaining = Infinity;
    for (let i = 0; i < keys.length; i++) {
      const entry = entries.get(keys[i]) ?? { count: 0, expires: now + values[2 * i + 1] };
      entry.count++;
      entries.set(keys[i], entry);
      remaining = Math.min(remaining, values[2 * i] - entry.count);
    }
    return Response.json({ result: [1, remaining, 0] });
  };
  return { fetcher, entries, setTime: (value: number) => { now = value; }, calls: () => calls };
}

test("limit groups cover API aliases, manifest, blobs, and metadata without matching lookalike prefixes", () => {
  const groups = {
    "/encrypted/manifest.json": "manifest",
    "/encrypted": "data", "/encrypted/": "data",
    "/encrypted/blobs/course.bin": "data", "/encrypted/blobs/course.meta.json": "data",
    "/api": "api", "/api/": "api", "/api/search": "api",
    "/api/course/CS/1010": "api", "/api/instructor/42": "api",
    "/api/mcp": "mcp", "/api/mcp/": "mcp", "/api/mcp/nested": "mcp",
    "/api/search-log": "log", "/api/search-log/": "log",
    "/api/mcp-lookalike": "api", "/api/search-log-lookalike": "api",
  } as const;
  for (const [path, group] of Object.entries(groups)) assert.equal(limitGroup(path), group, path);
  for (const path of ["/", "/about", "/apiary", "/encrypted-other/course.bin", "/_next/static/chunk.js"]) {
    assert.equal(limitGroup(path), null, path);
  }
});

test("percent-encoded aliases retain the canonical protection group and quota", async () => {
  const cases = [
    { canonical: "/encrypted/manifest.json", aliases: ["/%65ncrypted/manifest.json", "/encrypted/%6danifest.json", "/encrypted%2fmanifest.json?v=2"], name: "MANIFEST" },
    { canonical: "/encrypted/blobs/course.bin", aliases: ["/%65ncrypted/blobs/course.bin", "/encrypted/blobs/%63ourse.bin", "/encrypted%2fblobs/course.meta.json"], name: "DATA" },
    { canonical: "/api/mcp", aliases: ["/%61pi/mcp", "/api%2fmcp", "/api/%6dcp/", "/api/mcp?bust=1"], name: "MCP" },
    { canonical: "/api/search-log", aliases: ["/%61pi/search-log", "/api%2fsearch-log", "/api/search-%6cog/"], name: "LOG" },
    { canonical: "/api/search", aliases: ["/%61pi/search", "/api%2fsearch", "/api/%73earch?q=other"], name: "API" },
  ];
  for (const { canonical, aliases, name } of cases) {
    const store = new MemoryLimitStore(() => 0);
    const env = { ...production, [`RATE_LIMIT_${name}_PER_MINUTE`]: "1" };
    assert.equal((await checkRequestLimit(request(canonical), env, store)).rejection, undefined);
    for (const path of aliases) {
      assert.equal(limitGroup(new URL(request(path).url).pathname), limitGroup(canonical), path);
      assert.equal((await checkRequestLimit(request(path), env, store)).rejection?.status, 429, path);
    }
  }
});

test("IPv6 equivalent spellings and rotating /64 hosts share a normalized identity", () => {
  for (const ip of ["2001:db8:abcd:1234::1", "2001:0DB8:ABCD:1234:0000:0000:0000:0001", "2001:db8:abcd:1234:ffff:ffff:ffff:ffff"]) {
    assert.equal(normalizeClientIp(ip), "2001:db8:abcd:1234::/64");
  }
  assert.notEqual(normalizeClientIp("2001:db8:abcd:1235::1"), normalizeClientIp("2001:db8:abcd:1234::1"));
  assert.equal(normalizeClientIp("::1"), "0:0:0:0::/64");
});

test("IPv4-mapped IPv6 and plain IPv4 cannot obtain separate budgets", () => {
  for (const ip of ["203.0.113.7", "::ffff:203.0.113.7", "0:0:0:0:0:FFFF:cb00:7107", "::ffff:cb00:7107"]) {
    assert.equal(normalizeClientIp(ip), "203.0.113.7");
    assert.deepEqual(requestBuckets(clientHeaders({ "x-vercel-forwarded-for": ip }), "api", production),
      requestBuckets(clientHeaders(), "api", production));
  }
});

test("malformed, multi-hop, bracketed and port-bearing IP values are rejected", () => {
  for (const value of [null, "", "unknown", "999.1.1.1", "203.0.113.7:443", "203.0.113.7, 198.51.100.9", "[2001:db8::1]", " 203.0.113.7 "]) {
    assert.equal(normalizeClientIp(value), null, String(value));
  }
});

test("Vercel identity ignores spoofed generic forwarding, origin, and install headers", () => {
  const canonical = requestBuckets(clientHeaders(), "api", production);
  const forged = requestBuckets(clientHeaders({
    "x-forwarded-for": "198.51.100.1", "x-real-ip": "198.51.100.2",
    "forwarded": "for=198.51.100.3", "cf-connecting-ip": "198.51.100.4",
    "origin": "chrome-extension://forged", "x-install-id": "forged-install",
  }), "api", production);
  assert.deepEqual(forged.slice(0, 2), canonical);
  assert.equal(forged.length, 3);
  assert.equal(clientIdentity(clientHeaders(), { ...production, RATE_LIMIT_TRUSTED_IP_HEADER: "x-real-ip" }), "203.0.113.7");
  for (const { key } of forged) {
    assert.equal(key.includes("203.0.113.7"), false);
    assert.equal(key.includes("forged-install"), false);
    assert.match(key, /^unt-grades:\{[a-f0-9]{64}\}:api:/);
  }
});

test("production and Vercel fail closed when the trusted IP is absent or invalid", async () => {
  let calls = 0;
  const store: LimitStore = { async consume() { calls++; return { allowed: true, remaining: 10, retryAfter: 0 }; } };
  for (const env of [production, { ...production, RATE_LIMIT_TRUSTED_IP_HEADER: "x-real-ip" }, { NODE_ENV: "production" }]) {
    for (const ip of [undefined, "bad-ip", "203.0.113.7, 198.51.100.9"]) {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "203.0.113.7" });
      if (ip) headers.set("x-vercel-forwarded-for", ip);
      const result = await checkRequestLimit(new Request("https://example.test/api/search", { headers }), env, store);
      assert.equal(result.rejection?.status, 503);
      assertUncacheable(result.rejection!);
    }
  }
  assert.equal(calls, 0);
});

test("self-hosted production uses only its explicitly configured trusted header", () => {
  const env = { NODE_ENV: "production", RATE_LIMIT_TRUSTED_IP_HEADER: "  X-Trusted-Client-IP  " };
  assert.equal(clientIdentity(new Headers({ "x-trusted-client-ip": "198.51.100.9", "x-forwarded-for": "192.0.2.1" }), env), "198.51.100.9");
  assert.throws(() => clientIdentity(new Headers({ "x-forwarded-for": "192.0.2.1" }), env), /Trusted client IP/);
  assert.equal(clientIdentity(new Headers(), { NODE_ENV: "test" }), "local-development");
});

test("missing, rotating, and reused install IDs cannot reset the primary IP budget", async () => {
  const env = { ...production, RATE_LIMIT_API_PER_MINUTE: "3", RATE_LIMIT_API_PER_HOUR: "100", RATE_LIMIT_INSTALL_PER_MINUTE: "100" };
  const store = new MemoryLimitStore(() => 0);
  for (const install of [undefined, "install-a", "install-b"]) {
    const headers: HeadersInit = install ? { "x-install-id": install } : {};
    assert.equal((await checkRequestLimit(request("/api/search", headers), env, store)).rejection, undefined);
  }
  for (const install of [undefined, "install-c", "install-a"]) {
    const headers: HeadersInit = install ? { "x-install-id": install } : {};
    assert.equal((await checkRequestLimit(request("/api/search", headers), env, store)).rejection?.status, 429);
  }
  assert.equal((await checkRequestLimit(request("/api/search", { "x-vercel-forwarded-for": "203.0.113.8" }), env, store)).rejection, undefined);
});

test("install limits are supplemental and rejecting an install does not charge the IP", async () => {
  const env = { ...production, RATE_LIMIT_API_PER_MINUTE: "3", RATE_LIMIT_API_PER_HOUR: "10", RATE_LIMIT_INSTALL_PER_MINUTE: "1" };
  const store = new MemoryLimitStore(() => 0);
  const installed = request("/api/search", { "x-install-id": "same-install" });
  assert.equal((await checkRequestLimit(installed, env, store)).rejection, undefined);
  for (let i = 0; i < 10; i++) assert.equal((await checkRequestLimit(installed, env, store)).rejection?.status, 429);
  assert.equal((await checkRequestLimit(request(), env, store)).rejection, undefined);
  assert.equal((await checkRequestLimit(request(), env, store)).rejection, undefined);
  assert.equal((await checkRequestLimit(request(), env, store)).rejection?.status, 429);
});

test("path aliases and query/cache-busting changes share the same group budget", async () => {
  const store = new MemoryLimitStore(() => 0);
  const env = { ...production, RATE_LIMIT_API_PER_MINUTE: "3" };
  for (const path of ["/api/search?q=CS1010", "/api/search/?q=cs%201010", "/api/course/cs/1010?bust=1"]) {
    assert.equal((await checkRequestLimit(request(path), env, store)).rejection, undefined, path);
  }
  for (const path of ["/api/course/CS/1010", "/api/instructor/23?bust=2", "/api/search?q=other"]) {
    assert.equal((await checkRequestLimit(request(path), env, store)).rejection?.status, 429, path);
  }
  assert.equal((await checkRequestLimit(request("/encrypted/manifest.json"), env, store)).rejection, undefined);
});

test("IPv6 address rotation inside one /64 does not evade request quotas", async () => {
  const env = { ...production, RATE_LIMIT_API_PER_MINUTE: "1" };
  const store = new MemoryLimitStore(() => 0);
  assert.equal((await checkRequestLimit(request("/api/search", { "x-vercel-forwarded-for": "2001:db8:1:2::1" }), env, store)).rejection, undefined);
  assert.equal((await checkRequestLimit(request("/api/search", { "x-vercel-forwarded-for": "2001:0db8:1:2:ffff::abcd" }), env, store)).rejection?.status, 429);
  assert.equal((await checkRequestLimit(request("/api/search", { "x-vercel-forwarded-for": "2001:db8:1:3::1" }), env, store)).rejection, undefined);
});

test("namespace, client, and endpoint group isolation preserve one cluster hash slot per request", () => {
  const base = requestBuckets(clientHeaders({ "x-install-id": "one" }), "api", production);
  const tags = base.map(({ key }) => key.match(/\{([^}]+)\}/)?.[1]);
  assert.equal(new Set(tags).size, 1);
  assert.ok(tags[0]);
  for (const alternative of [
    requestBuckets(clientHeaders(), "data", production),
    requestBuckets(clientHeaders(), "api", { ...production, RATE_LIMIT_NAMESPACE: "preview" }),
    requestBuckets(clientHeaders({ "x-vercel-forwarded-for": "203.0.113.8" }), "api", production),
  ]) assert.notEqual(alternative[0].key, base[0].key);
});

test("invalid rate-limit settings fail closed instead of disabling protection", async () => {
  const store = new MemoryLimitStore(() => 0);
  for (const value of ["", "0", "-1", "1.5", "NaN", "Infinity", "9007199254740992"]) {
    const result = await checkRequestLimit(request(), { ...production, RATE_LIMIT_API_PER_MINUTE: value }, store);
    assert.equal(result.rejection?.status, 503, value);
  }
});

test("429 returns rounded-up Retry-After and prevents browser and CDN caching", async () => {
  let now = 0;
  const store = new MemoryLimitStore(() => now);
  const env = { ...production, RATE_LIMIT_API_PER_MINUTE: "1" };
  const allowed = await checkRequestLimit(request(), env, store);
  assert.equal(allowed.headers.get("x-ratelimit-remaining"), "0");
  assert.equal(allowed.headers.has("cache-control"), false);
  now = 59_001;
  const { rejection } = await checkRequestLimit(request(), env, store);
  assert.ok(rejection);
  assert.equal(rejection.status, 429);
  assert.equal(rejection.headers.get("retry-after"), "1");
  assert.equal(rejection.headers.get("x-ratelimit-remaining"), "0");
  assertUncacheable(rejection);
  assert.deepEqual(await rejection.json(), { error: "Rate limit exceeded. Please retry later." });
});

test("missing or partial shared-store config fails closed in production and on Vercel", async () => {
  for (const env of [
    production,
    { VERCEL: "1", NODE_ENV: "development" },
    { ...production, RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test" },
    { ...production, RATE_LIMIT_REDIS_REST_TOKEN: "private-token" },
    { ...production, RATE_LIMIT_REDIS_REST_URL: "http://redis.example.test", RATE_LIMIT_REDIS_REST_TOKEN: "private-token" },
  ]) {
    const { rejection } = await checkRequestLimit(request(), env);
    assert.equal(rejection?.status, 503);
    assert.equal(rejection?.headers.get("retry-after"), "30");
    assertUncacheable(rejection!);
    assert.doesNotMatch(await rejection!.text(), /private-token|redis\.example|203\.0\.113\.7/);
  }
});

test("Vercel build guard rejects missing, partial and insecure shared-store configuration", () => {
  for (const env of [
    { VERCEL: "1" },
    { VERCEL: "1", RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test" },
    { VERCEL: "1", RATE_LIMIT_REDIS_REST_TOKEN: "token" },
    { VERCEL: "1", RATE_LIMIT_REDIS_REST_URL: "http://redis.example.test", RATE_LIMIT_REDIS_REST_TOKEN: "token" },
    { VERCEL: "1", RATE_LIMIT_REDIS_REST_URL: "not-a-url", RATE_LIMIT_REDIS_REST_TOKEN: "token" },
  ]) assert.throws(() => assertVercelRateLimitConfiguration(env));
});

test("Vercel build guard accepts complete HTTPS config without contacting Redis", (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("build must not contact Redis"); });
  assert.doesNotThrow(() => assertVercelRateLimitConfiguration({
    ...production, RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test", RATE_LIMIT_REDIS_REST_TOKEN: "fake-token",
  }));
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.doesNotThrow(() => assertVercelRateLimitConfiguration({ NODE_ENV: "development" }));
  assert.doesNotThrow(() => assertVercelRateLimitConfiguration({ NODE_ENV: "production" }));
});

test("Vercel build guard validates every endpoint quota and supplemental install quota", () => {
  const env = { ...production, RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test", RATE_LIMIT_REDIS_REST_TOKEN: "fake-token" };
  const names = ["MANIFEST", "DATA", "API", "MCP", "LOG"].flatMap((group) => [
    `RATE_LIMIT_${group}_PER_MINUTE`, `RATE_LIMIT_${group}_PER_HOUR`,
  ]);
  names.push("RATE_LIMIT_INSTALL_PER_MINUTE");
  for (const name of names) {
    assert.throws(() => assertVercelRateLimitConfiguration({ ...env, [name]: "0" }), /Invalid rate-limit configuration/, name);
    assert.doesNotThrow(() => assertVercelRateLimitConfiguration({ ...env, [name]: "1" }), name);
  }
});

test("store failure produces a generic uncacheable 503 without leaking secrets", async () => {
  const store: LimitStore = { async consume() { throw new Error("private-token redis.example.test 203.0.113.7"); } };
  const { rejection } = await checkRequestLimit(request(), production, store);
  assert.equal(rejection?.status, 503);
  assert.equal(rejection?.headers.get("retry-after"), "30");
  assertUncacheable(rejection!);
  assert.deepEqual(await rejection!.json(), { error: "Request protection is temporarily unavailable. Please retry later." });
});

test("OPTIONS and unrelated paths never consult identity, consume quota, or fetch Redis", async () => {
  let calls = 0;
  const store: LimitStore = { async consume() { calls++; throw new Error("must not consume"); } };
  for (const path of ["/api/search", "/api/mcp", "/api/search-log", "/encrypted/manifest.json", "/encrypted/blobs/course.bin"]) {
    const result = await checkRequestLimit(new Request(`https://example.test${path}`, { method: "OPTIONS" }), production, store);
    assert.equal(result.rejection, undefined);
    assert.equal([...result.headers].length, 0);
  }
  assert.equal((await checkRequestLimit(new Request("https://example.test/about"), production, store)).rejection, undefined);
  assert.equal(calls, 0);
});

test("memory windows reset at exact minute/hour boundaries and denials do not extend them", async () => {
  let now = 0;
  const store = new MemoryLimitStore(() => now);
  const buckets = [bucket("minute", 1), bucket("hour", 2, HOUR)];
  assert.equal((await store.consume(buckets)).allowed, true);
  now = MINUTE - 1;
  assert.deepEqual(await store.consume(buckets), { allowed: false, remaining: 0, retryAfter: 1 });
  now = MINUTE;
  assert.equal((await store.consume(buckets)).allowed, true);
  now = 2 * MINUTE;
  assert.deepEqual(await store.consume(buckets), { allowed: false, remaining: 0, retryAfter: 3480 });
  now = HOUR - 1;
  assert.deepEqual(await store.consume(buckets), { allowed: false, remaining: 0, retryAfter: 1 });
  now = HOUR;
  assert.equal((await store.consume(buckets)).allowed, true);
});

test("atomic rejection never charges another bucket or creates a rotating install bucket", async () => {
  const store = new MemoryLimitStore(() => 0, 2);
  assert.equal((await store.consume([bucket("exhausted", 1)])).allowed, true);
  for (let i = 0; i < 100; i++) {
    assert.equal((await store.consume([bucket(`rotating-${i}`, 1), bucket("exhausted", 1)])).allowed, false);
  }
  assert.deepEqual(await store.consume([bucket("still-free", 2)]), { allowed: true, remaining: 1, retryAfter: 0 });
  assert.equal((await store.consume([bucket("still-free", 2)])).allowed, true);
});

test("concurrent in-memory requests cannot overspend minute or hour budgets", async () => {
  const store = new MemoryLimitStore(() => 0);
  const buckets = [bucket("minute", 10), bucket("hour", 20, HOUR)];
  const results = await Promise.all(Array.from({ length: 100 }, () => store.consume(buckets)));
  assert.equal(results.filter((result) => result.allowed).length, 10);
  assert.equal(results.filter((result) => !result.allowed).length, 90);
  assert.equal((await store.consume([bucket("hour", 20, HOUR)])).remaining, 9);
});

test("bounded memory rejects new identities without evicting live budgets and frees expired entries", async () => {
  let now = 0;
  const store = new MemoryLimitStore(() => now, 2);
  assert.equal((await store.consume([bucket("a", 1)])).allowed, true);
  assert.equal((await store.consume([bucket("b", 1)])).allowed, true);
  await assert.rejects(store.consume([bucket("c", 1)]), /store is full/);
  assert.equal((await store.consume([bucket("a", 1)])).allowed, false);
  assert.equal((await store.consume([bucket("b", 1)])).allowed, false);
  now = MINUTE;
  assert.equal((await store.consume([bucket("c", 1), bucket("d", 1)])).allowed, true);
});

test("capacity failure is atomic and does not partially charge existing buckets", async () => {
  const store = new MemoryLimitStore(() => 0, 2);
  assert.equal((await store.consume([bucket("existing", 2)])).remaining, 1);
  await assert.rejects(store.consume([bucket("existing", 2), bucket("new-a", 1), bucket("new-b", 1)]), /store is full/);
  assert.equal((await store.consume([bucket("existing", 2)])).allowed, true);
  assert.equal((await store.consume([bucket("new-a", 1)])).allowed, true);
});

test("174 genuine course blob/metadata files fit in the default browser and extension data budget", async () => {
  const root = new URL("../../public/encrypted/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8")) as { id: string }[];
  assert.ok(manifest.length >= 87);
  const paths = manifest.slice(0, 87).flatMap(({ id }) => [`blobs/${id}`, `blobs/${id.replace(/\.bin$/, ".meta.json")}`]);
  assert.equal(new Set(paths).size, 174);
  await Promise.all(paths.map((path) => access(new URL(path, root))));
  const installs: HeadersInit[] = [{}, { "x-install-id": "genuine-extension-install" }];
  for (const extra of installs) {
    const store = new MemoryLimitStore(() => 0);
    const results = await Promise.all(paths.map((path) => checkRequestLimit(request(`/encrypted/${path}`, extra), production, store)));
    assert.equal(results.filter((result) => result.rejection).length, 0);
  }
});

test("Redis uses one atomic EVAL, shared-slot keys, HTTPS, no cache, and a timeout", async () => {
  const buckets = requestBuckets(clientHeaders({ "x-install-id": "install" }), "data", production);
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://redis.example.test");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-token");
    assert.equal(new Headers(init?.headers).get("content-type"), "application/json");
    assert.deepEqual(JSON.parse(String(init?.body)), ["EVAL", CONSUME_SCRIPT, buckets.length,
      ...buckets.map(({ key }) => key), ...buckets.flatMap(({ limit, windowMs }) => [limit, windowMs])]);
    return Response.json({ result: [1, 399, 0] });
  };
  const store = new RedisLimitStore("https://redis.example.test/", "test-token", fetcher);
  assert.equal((await store.consume(buckets)).allowed, true);
  assert.equal(calls, 1);
  assert.throws(() => new RedisLimitStore("http://redis.example.test", "test-token", fetcher), /HTTPS/);
});

test("independent Redis clients share one budget under concurrent requests", async () => {
  const backend = redisBackend();
  const first = new RedisLimitStore("https://redis.example.test", "token", backend.fetcher);
  const second = new RedisLimitStore("https://redis.example.test", "token", backend.fetcher);
  const buckets = [bucket("minute", 7), bucket("hour", 20, HOUR)];
  const results = await Promise.all(Array.from({ length: 100 }, (_, index) => (index % 2 ? first : second).consume(buckets)));
  assert.equal(results.filter((result) => result.allowed).length, 7);
  assert.equal(results.filter((result) => !result.allowed).length, 93);
  assert.equal(backend.entries.get("hour")?.count, 7);
  assert.equal(backend.calls(), 100);
  backend.setTime(MINUTE);
  assert.equal((await second.consume(buckets)).allowed, true);
  assert.equal(backend.entries.get("hour")?.count, 8);
});

test("Redis server expiry owns exact reset boundaries and rejections charge no other keys", async () => {
  const backend = redisBackend();
  const first = new RedisLimitStore("https://redis.example.test", "token", backend.fetcher);
  const second = new RedisLimitStore("https://redis.example.test", "token", backend.fetcher);
  const buckets = [bucket("minute", 1), bucket("hour", 2, HOUR)];
  assert.equal((await first.consume(buckets)).allowed, true);
  backend.setTime(MINUTE - 1);
  assert.equal((await second.consume(buckets)).retryAfter, 1);
  assert.equal(backend.entries.get("hour")?.count, 1);
  backend.setTime(MINUTE);
  assert.equal((await second.consume(buckets)).allowed, true);
  backend.setTime(2 * MINUTE);
  assert.equal((await first.consume(buckets)).allowed, false);
  assert.equal(backend.entries.has("minute"), false);
  backend.setTime(HOUR);
  assert.equal((await first.consume(buckets)).allowed, true);
});

test("Redis transport failures, HTTP failures, and malformed JSON fail closed", async () => {
  const fetchers: typeof fetch[] = [
    async () => { throw new Error("network token-secret"); },
    async () => new Response("unavailable", { status: 500 }),
    async () => new Response("not JSON", { status: 200 }),
  ];
  for (const fetcher of fetchers) {
    const store = new RedisLimitStore("https://redis.example.test", "token-secret", fetcher);
    const { rejection } = await checkRequestLimit(request(), production, store);
    assert.equal(rejection?.status, 503);
    assertUncacheable(rejection!);
    assert.doesNotMatch(await rejection!.text(), /network|token-secret|not JSON/);
  }
});

test("Redis rejects malformed result tuples rather than treating them as allowance", async (t) => {
  for (const body of [
    null, {}, { error: "ERR failed" }, { result: null }, { result: [] },
    { result: [1, 2] }, { result: [1, 2, 0, 4] }, { result: ["1", 2, 0] },
    { result: [1, "2", 0] }, { result: [2, 0, 0] }, { result: [1, -1, 0] },
    { result: [0, 0, -1] }, { result: [1, null, 0] },
    { result: [1, 1.5, 0] }, { result: [1, Number.MAX_SAFE_INTEGER + 1, 0] },
    { result: [1, 120, 0] }, { result: [1, 121, 0] }, { result: [1, 5, 60_000] }, { result: [0, 5, 60_000] }, { result: [0, 0, 0] },
    { result: [0, 0, 1.5] },
  ]) {
    await t.test(JSON.stringify(body), async () => {
      const store = new RedisLimitStore("https://redis.example.test", "token", async () => Response.json(body));
      const { rejection } = await checkRequestLimit(request(), production, store);
      assert.equal(rejection?.status, 503);
    });
  }
});
