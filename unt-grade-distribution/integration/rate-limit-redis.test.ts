import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import { promisify } from "node:util";
import {
  checkRequestLimit, NO_STORE_HEADERS, RedisLimitStore, requestBuckets,
} from "../src/lib/rate-limit";

const exec = promisify(execFile);
const container = process.env.REDIS_TEST_CONTAINER;
const port = process.env.REDIS_TEST_PORT;
// This suite never accepts production URLs, credentials, or non-loopback hosts.
// CI supplies an isolated official Redis service container; local runs use CLI.
assert.ok(container || port, "Set REDIS_TEST_CONTAINER or REDIS_TEST_PORT for an isolated local Redis instance");
if (container) assert.match(container, /^[a-zA-Z0-9_-]+$/);
if (port) assert.ok(/^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535);

async function redis(...command: Array<string | number>): Promise<unknown> {
  const [program, ...prefix] = container
    ? ["docker", "exec", container, "redis-cli", "--json"]
    : ["redis-cli", "-h", "127.0.0.1", "-p", port!, "--json"];
  const { stdout } = await exec(program, [...prefix, ...command.map(String)], { timeout: 5_000, maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout);
}

let server: Server;
let localEndpoint: string;
const touchedKeys = new Set<string>();
const base = `integration-${randomUUID()}`;

before(async () => {
  assert.equal(await redis("PING"), "PONG");
  // Minimal Redis REST protocol fixture. The production adapter sends the real
  // EVAL HTTP body; redis-cli forwards it unchanged to the actual Redis engine.
  // Only the network destination is mapped to loopback, never TLS settings.
  server = createServer(async (req, res) => {
    try {
      assert.equal(req.method, "POST");
      assert.equal(req.headers.authorization, "Bearer synthetic-integration-token");
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        assert.ok(bytes <= 16 * 1024);
        chunks.push(Buffer.from(chunk));
      }
      const command: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.ok(Array.isArray(command) && command[0] === "EVAL");
      const keyCount = Number(command[2]);
      assert.ok(Number.isInteger(keyCount) && keyCount >= 2 && keyCount <= 3);
      for (const key of command.slice(3, 3 + keyCount)) {
        assert.ok(typeof key === "string" && key.startsWith(base));
        touchedKeys.add(key);
      }
      const result = await redis(...command);
      assert.ok(Array.isArray(result), `Redis EVAL failed: ${JSON.stringify(result)}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (error) {
      console.error("Local Redis fixture failed", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Local Redis fixture failed" }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  localEndpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  // Delete only this run's disposable keys; never FLUSHDB/FLUSHALL.
  if (touchedKeys.size) await redis("DEL", ...touchedKeys);
});

function store() {
  return new RedisLimitStore("https://synthetic-redis.example.test", "synthetic-integration-token",
    (_url, init) => fetch(localEndpoint, init));
}

function request(install?: string) {
  return new Request("https://example.test/api/search?q=a", {
    headers: { "x-vercel-forwarded-for": "192.0.2.123", ...(install ? { "x-install-id": install } : {}) },
  });
}

function environment(suffix: string, minute: number, hour: number) {
  return {
    VERCEL: "1", NODE_ENV: "production", RATE_LIMIT_NAMESPACE: `${base}:${suffix}`,
    RATE_LIMIT_API_PER_MINUTE: String(minute), RATE_LIMIT_API_PER_HOUR: String(hour),
  };
}

async function expire(key: string) {
  assert.equal(await redis("PEXPIRE", key, 1), 1);
  const deadline = Date.now() + 5_000;
  while (await redis("PTTL", key) !== -2) {
    assert.ok(Date.now() < deadline, "Redis key did not expire");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("production Lua atomically admits concurrent requests across independent REST clients", async () => {
  const env = environment("concurrency", 3, 5);
  const stores = [store(), store()];
  const outcomes = await Promise.all(Array.from({ length: 8 }, (_, i) => checkRequestLimit(request(), env, stores[i % 2])));
  assert.equal(outcomes.filter(({ rejection }) => !rejection).length, 3);
  const denied = outcomes.filter(({ rejection }) => rejection);
  assert.equal(denied.length, 5);
  for (const { rejection } of denied) {
    assert.equal(rejection!.status, 429);
    assert.ok(Number(rejection!.headers.get("Retry-After")) > 0);
    for (const [name, value] of Object.entries(NO_STORE_HEADERS)) assert.equal(rejection!.headers.get(name), value);
    assert.deepEqual(await rejection!.json(), { error: "Rate limit exceeded. Please retry later." });
  }
  const keys = requestBuckets(request().headers, "api", env).map(({ key }) => key);
  assert.deepEqual(await redis("MGET", ...keys), ["3", "3"]);
  const minuteTtl = await redis("PTTL", keys[0]) as number;
  const hourTtl = await redis("PTTL", keys[1]) as number;
  assert.ok(minuteTtl > 0 && minuteTtl <= 60_000);
  assert.ok(hourTtl > 0 && hourTtl <= 3_600_000);

  // Expire real Redis keys to exercise each window without an hour-long sleep.
  await expire(keys[0]);
  const afterMinute = await Promise.all(Array.from({ length: 3 }, (_, i) => checkRequestLimit(request(), env, stores[i % 2])));
  assert.equal(afterMinute.filter(({ rejection }) => !rejection).length, 2);
  assert.equal(afterMinute.find(({ rejection }) => rejection)?.rejection?.status, 429);
  // Hourly rejection must not charge the fresh minute window.
  assert.deepEqual(await redis("MGET", ...keys), ["2", "5"]);
  await Promise.all(keys.map(expire));
  assert.equal((await checkRequestLimit(request(), env, store())).rejection, undefined);
  assert.deepEqual(await redis("MGET", ...keys), ["1", "1"]);
});

test("production Lua always applies IP quotas and rejects installations without secondary charging", async () => {
  const env = { ...environment("install", 3, 100), RATE_LIMIT_INSTALL_PER_MINUTE: "1" };
  const client = store();
  assert.equal((await checkRequestLimit(request("first"), env, client)).rejection, undefined);
  assert.equal((await checkRequestLimit(request("first"), env, client)).rejection?.status, 429);
  assert.equal((await checkRequestLimit(request(), env, client)).rejection, undefined);
  assert.equal((await checkRequestLimit(request("second"), env, client)).rejection, undefined);
  assert.equal((await checkRequestLimit(request("rotated"), env, client)).rejection?.status, 429);
  const keys = requestBuckets(request("rotated").headers, "api", env).map(({ key }) => key);
  assert.deepEqual(await redis("MGET", ...keys), ["3", "3", null]);
});
