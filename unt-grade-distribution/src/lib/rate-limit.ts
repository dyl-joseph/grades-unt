import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { NO_STORE_HEADERS } from "./no-store";

type Environment = Record<string, string | undefined>;
export type LimitGroup = "manifest" | "data" | "api" | "mcp" | "log";
export type Bucket = { key: string; limit: number; windowMs: number };
export type LimitResult = { allowed: boolean; remaining: number; retryAfter: number };
export interface LimitStore { consume(buckets: Bucket[]): Promise<LimitResult> }

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DEFAULTS: Record<LimitGroup, [number, number]> = {
  manifest: [120, 1_200],
  // Instructor pages currently fetch up to 87 courses, two files per course.
  data: [600, 6_000],
  api: [120, 1_200],
  mcp: [60, 600],
  log: [60, 600],
};

export function limitGroup(pathname: string): LimitGroup | null {
  // Next's filesystem router accepts percent-encoded aliases of public files.
  // Match their canonical identity too; encoded paths also enter the proxy.
  try { pathname = decodeURIComponent(pathname); } catch { return null; }
  if (pathname === "/encrypted/manifest.json") return "manifest";
  if (pathname === "/encrypted" || pathname.startsWith("/encrypted/")) return "data";
  if (pathname === "/api/mcp" || pathname.startsWith("/api/mcp/")) return "mcp";
  if (pathname === "/api/search-log" || pathname.startsWith("/api/search-log/")) return "log";
  if (pathname === "/api" || pathname.startsWith("/api/")) return "api";
  return null;
}

function positiveInteger(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid rate-limit configuration");
  return number;
}

// Collapse equivalent spellings and group IPv6 addresses by /64. Do not trust
// client-controlled X-Forwarded-For, X-Real-IP, Origin, or install IDs as identity.
export function normalizeClientIp(value: string | null): string | null {
  if (!value || value.includes("%") || !isIP(value)) return null;
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const [left, right = ""] = canonical.split("::");
  const start = left ? left.split(":") : [];
  const end = right ? right.split(":") : [];
  const parts = [...start, ...Array(8 - start.length - end.length).fill("0"), ...end]
    .map((part) => parseInt(part, 16));
  // IPv4-mapped IPv6 must share its IPv4 budget.
  if (parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff) {
    return `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`;
  }
  return `${parts.slice(0, 4).map((part) => part.toString(16)).join(":")}::/64`;
}

export function clientIdentity(headers: Headers, env: Environment): string {
  if (env.VERCEL === "1") {
    const ip = normalizeClientIp(headers.get("x-vercel-forwarded-for"));
    if (!ip) throw new Error("Trusted client IP is unavailable");
    return ip;
  }
  // Self-hosted deployments must explicitly name a header that their trusted
  // reverse proxy OVERWRITES and prevent direct access to the origin server.
  const trustedHeader = env.RATE_LIMIT_TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (trustedHeader) {
    const ip = normalizeClientIp(headers.get(trustedHeader));
    if (!ip) throw new Error("Trusted client IP is unavailable");
    return ip;
  }
  if (env.NODE_ENV === "production") throw new Error("Trusted client IP is not configured");
  return "local-development";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function requestBuckets(headers: Headers, group: LimitGroup, env: Environment): Bucket[] {
  const ip = digest(clientIdentity(headers, env));
  const namespace = env.RATE_LIMIT_NAMESPACE?.trim() || "unt-grades";
  // One hash tag keeps this request's atomic operation in one Redis cluster slot.
  const prefix = `${namespace}:{${ip}}:${group}`;
  const [minute, hour] = DEFAULTS[group];
  const name = group.toUpperCase();
  const buckets: Bucket[] = [
    { key: `${prefix}:minute`, limit: positiveInteger(env[`RATE_LIMIT_${name}_PER_MINUTE`], minute), windowMs: MINUTE },
    { key: `${prefix}:hour`, limit: positiveInteger(env[`RATE_LIMIT_${name}_PER_HOUR`], hour), windowMs: HOUR },
  ];
  const install = headers.get("x-install-id");
  if (install) {
    // Supplemental only: omitting, rotating, or forging it never resets IP limits.
    buckets.push({
      key: `${prefix}:install:${digest(install)}:minute`,
      limit: positiveInteger(env.RATE_LIMIT_INSTALL_PER_MINUTE, group === "data" ? 400 : 100),
      windowMs: MINUTE,
    });
  }
  return buckets;
}

// Atomic check-then-charge: rejected attempts do not consume other buckets.
// Redis TTL owns expiry, so serverless instance clocks cannot reset budgets.
export const CONSUME_SCRIPT = `
local remaining = 2147483647
local retry = 0
for i, key in ipairs(KEYS) do
  local count = tonumber(redis.call('GET', key) or '0')
  local limit = tonumber(ARGV[(i - 1) * 2 + 1])
  local ttl = redis.call('PTTL', key)
  if count >= limit then
    if ttl < 0 then ttl = tonumber(ARGV[(i - 1) * 2 + 2]) end
    retry = math.max(retry, math.max(1, ttl))
  end
end
if retry > 0 then return {0, 0, retry} end
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  local window = tonumber(ARGV[(i - 1) * 2 + 2])
  if count == 1 or redis.call('PTTL', key) < 0 then redis.call('PEXPIRE', key, window) end
  remaining = math.min(remaining, tonumber(ARGV[(i - 1) * 2 + 1]) - count)
end
return {1, remaining, 0}
`;

export class RedisLimitStore implements LimitStore {
  constructor(private url: string, private token: string, private request: typeof fetch = fetch) {
    if (new URL(url).protocol !== "https:") throw new Error("Rate-limit Redis REST URL must use HTTPS");
  }

  async consume(buckets: Bucket[]): Promise<LimitResult> {
    const response = await this.request(this.url.replace(/\/$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        "EVAL", CONSUME_SCRIPT, buckets.length, ...buckets.map(({ key }) => key),
        ...buckets.flatMap(({ limit, windowMs }) => [limit, windowMs]),
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error("Rate-limit store is unavailable");
    const body: unknown = await response.json();
    const values = body && typeof body === "object" && "result" in body ? body.result : null;
    if (!Array.isArray(values) || values.length !== 3 || !values.every(Number.isSafeInteger) ||
      ![0, 1].includes(values[0]) || values[1] < 0 || values[2] < 0 ||
      (values[0] === 1 && (values[2] !== 0 || values[1] >= Math.min(...buckets.map(({ limit }) => limit)))) ||
      (values[0] === 0 && (values[1] !== 0 || values[2] === 0))) {
      throw new Error("Invalid rate-limit store response");
    }
    return { allowed: values[0] === 1, remaining: values[1], retryAfter: values[0] === 1 ? 0 : Math.max(1, Math.ceil(values[2] / 1000)) };
  }
}

// Development/test only. Bounded memory and no eviction of live budgets.
export class MemoryLimitStore implements LimitStore {
  private entries = new Map<string, { count: number; resetAt: number }>();
  constructor(private now = Date.now, private capacity = 10_000) {}

  async consume(buckets: Bucket[]): Promise<LimitResult> {
    const now = this.now();
    for (const [key, value] of this.entries) if (value.resetAt <= now) this.entries.delete(key);
    let retryAfter = 0;
    for (const { key, limit } of buckets) {
      const entry = this.entries.get(key);
      if (entry && entry.count >= limit) retryAfter = Math.max(retryAfter, Math.ceil((entry.resetAt - now) / 1000));
    }
    if (retryAfter) return { allowed: false, remaining: 0, retryAfter };
    if (this.entries.size + buckets.filter(({ key }) => !this.entries.has(key)).length > this.capacity) {
      throw new Error("Development rate-limit store is full");
    }
    let remaining = Infinity;
    for (const { key, limit, windowMs } of buckets) {
      const entry = this.entries.get(key) ?? { count: 0, resetAt: now + windowMs };
      entry.count++;
      this.entries.set(key, entry);
      remaining = Math.min(remaining, limit - entry.count);
    }
    return { allowed: true, remaining, retryAfter: 0 };
  }
}

const localStore = new MemoryLimitStore();
function configuredStore(env: Environment): LimitStore {
  const url = env.RATE_LIMIT_REDIS_REST_URL?.trim();
  const token = env.RATE_LIMIT_REDIS_REST_TOKEN?.trim();
  if (url && token) return new RedisLimitStore(url, token);
  if (url || token || env.NODE_ENV === "production" || env.VERCEL === "1") {
    throw new Error("Shared rate-limit store is not configured");
  }
  return localStore;
}

// A Vercel build must fail before promotion if protection cannot be configured.
// This performs no network calls and does not provision or verify a live store.
export function assertVercelRateLimitConfiguration(env: Environment = process.env) {
  if (env.VERCEL !== "1") return;
  configuredStore(env);
  const headers = new Headers({ "x-vercel-forwarded-for": "192.0.2.1", "x-install-id": "configuration-check" });
  for (const group of Object.keys(DEFAULTS) as LimitGroup[]) requestBuckets(headers, group, env);
}

export { NO_STORE_HEADERS };

export async function checkRequestLimit(
  request: Request,
  env: Environment = process.env,
  store?: LimitStore,
): Promise<{ headers: Headers; rejection?: Response }> {
  const group = limitGroup(new URL(request.url).pathname);
  const headers = new Headers();
  if (!group || request.method === "OPTIONS") return { headers };
  try {
    const buckets = requestBuckets(request.headers, group, env);
    const result = await (store ?? configuredStore(env)).consume(buckets);
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    if (result.allowed) return { headers };
    for (const [name, value] of Object.entries(NO_STORE_HEADERS)) headers.set(name, value);
    headers.set("Retry-After", String(result.retryAfter));
    return { headers, rejection: Response.json({ error: "Rate limit exceeded. Please retry later." }, { status: 429, headers }) };
  } catch {
    // Fail closed instead of silently downgrading to per-instance limits. Do not
    // include configuration, network errors, tokens, or client addresses in output.
    for (const [name, value] of Object.entries(NO_STORE_HEADERS)) headers.set(name, value);
    headers.set("Retry-After", "30");
    return { headers, rejection: Response.json({ error: "Request protection is temporarily unavailable. Please retry later." }, { status: 503, headers }) };
  }
}
