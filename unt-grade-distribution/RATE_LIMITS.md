# Data access rate limits

## Before deploying this change

**Configure a shared Redis REST backend in both the preview and production hosting environments before promotion.** Vercel builds fail before promotion when the required variables or quotas are missing/invalid. At runtime, protected routes return **503** when production configuration is missing, invalid, or unavailable. A successful build does not verify backend connectivity. The local-memory fallback is deliberately unavailable in production and on Vercel. This repository change does not provision a service, set credentials, change firewall rules, or deploy anything.

Required server-only variables:

- `RATE_LIMIT_REDIS_REST_URL`: HTTPS endpoint for a Redis REST service supporting `EVAL` (for example, an existing Upstash Redis REST endpoint)
- `RATE_LIMIT_REDIS_REST_TOKEN`: its REST write token, stored as a hosting secret; never use a `NEXT_PUBLIC_` variable
- `RATE_LIMIT_NAMESPACE`: optional, defaults to `unt-grades`. Use a separate preview namespace/backend, but keep the same namespace for all production aliases and instances. Changing it resets the effective quotas

The Vercel runtime uses **only** `x-vercel-forwarded-for`, and only when `VERCEL=1`. It does not use caller-supplied `X-Forwarded-For`, `X-Real-IP`, `Origin`, or install IDs as the primary identity. Missing or malformed trusted addresses fail closed.

For a self-hosted production deployment, additionally set `RATE_LIMIT_TRUSTED_IP_HEADER` to a header your trusted reverse proxy **overwrites**. Block direct access to the application origin. Merely configuring a header without enforcing that network boundary makes the identity spoofable. Any additional CDN must run the limiter before cache lookup; serving `/public/encrypted` separately bypasses this protection. Development without those variables uses one shared local-development identity and a bounded process-local store, only for local testing.

## Coverage and defaults

`src/proxy.ts` is the single quota enforcement point, before route handlers and static files. Its matcher covers `/api/:path*`, `/encrypted/:path*`, and percent-encoded path aliases. The limiter canonicalizes encoded aliases into the same quota group. Do not add route-local charging or trust an “already checked” request header.

| Group | Paths | Per minute/IP | Per hour/IP |
| --- | --- | ---: | ---: |
| Manifest | `/encrypted/manifest.json` | 120 | 1,200 |
| Data | All other `/encrypted/*` paths, including blob and metadata files | 600 | 6,000 |
| API | `/api/search`, `/api/course/*`, `/api/instructor/*`, other API paths | 120 | 1,200 |
| MCP | `/api/mcp`, including GET and POST transport messages | 60 | 600 |
| Log | `/api/search-log` | 60 | 600 |

Override any group with `RATE_LIMIT_<GROUP>_PER_MINUTE` and `RATE_LIMIT_<GROUP>_PER_HOUR`, where `<GROUP>` is `MANIFEST`, `DATA`, `API`, `MCP`, or `LOG`. Values must be positive safe integers. Windows start with the first accepted request and reset at expiry; fixed windows permit a boundary burst. Both windows are always enforced.

`X-Install-ID`, when present, adds a supplemental per-IP/per-install/per-group minute limit: 400 for data, 100 otherwise. `RATE_LIMIT_INSTALL_PER_MINUTE` overrides that value. Omitting or rotating the ID never bypasses the mandatory IP limits. IPv6 identities are normalized to /64; IPv4-mapped addresses share the IPv4 budget. Redis keys contain a SHA-256-derived address identifier rather than the address, and expire with the budget. This is pseudonymization, not anonymization.

The current largest instructor view fetches 87 courses, or **174 blob/metadata requests**. The data defaults allow that fanout and modest comparison traffic. People sharing campus Wi-Fi/NAT also share a quota, so monitor real demand and tune those limits deliberately. Unauthenticated IP limits cannot distinguish a busy campus from a scraper, or prevent distributed scraping. `OPTIONS` requests are uncharged and never perform data/Redis work. Invalid or unsupported non-OPTIONS requests still consume a slot. Query strings, hostname aliases, and individual course paths do not create new budgets.

An atomic Redis Lua operation checks every bucket before incrementing any. Rejected attempts do not charge a second bucket. Shared Redis expiry owns the reset time; separate serverless instances share the same counters. Every protected non-OPTIONS request, including denied attempts, makes one Redis REST/EVAL request. Provider command billing, included quotas, storage, and networking prices vary; review the chosen plan and expected traffic rather than assuming it is free. This change uses no paid service until a maintainer configures one. The request to Redis has a two-second timeout. Store/configuration failures return 503 with `Retry-After: 30`; exhausted quotas return 429 with the remaining reset delay. Both include browser/CDN no-store headers and return no grade data. Allowed static responses retain their existing caching policy: on Vercel, Routing Middleware runs before its CDN cache. Browser-cached data already delivered can naturally be reused without a new request.

## MCP and payload handling

MCP retains ordinary numeric grade answers and existing tool names, pagination, and schemas. Initialize, tools/list, tools/call, and GET transport requests all consume the MCP request budget. Every POST must contain a single JSON-RPC message. Legacy array batches are rejected with 400 before tools execute, closing the SDK's up-to-100-calls-per-request amplification path.

MCP POST bodies are capped at 32 KiB and logging bodies at 4 KiB, based on actual streamed bytes, with a five-second body-read timeout. Oversized bodies return 413 before the adapter or logging write. Logging bodies must be objects. These bounds supplement platform-level request-size and execution limits.

Website reads remain encrypted blobs and metadata. Client 429/5xx failures display retry-later messages; instructor fanout does not silently report partial grade distributions when throttled. There are no automatic retry loops.

## Security boundary

`NEXT_PUBLIC_DATA_KEY` is intentionally shipped to the browser. Encryption here is packaging/obfuscation, **not authorization or a guarantee against extraction**. A determined caller can decrypt any downloaded course just like the browser. The MCP and compatibility REST endpoints intentionally return plaintext answers within their quotas so ordinary clients keep working. Over-limit requests are rejected, not replaced with misleading fake data. Public repository files and previously downloaded data are also outside these request controls. Stronger confidentiality or per-person access requires authenticated authorization and a different data-distribution design.

## Validation and rollout checklist

Local checks (Node 22):

```sh
npm ci --prefix unt-grade-distribution
npm ci --prefix extension
scripts/ci-local.sh
(cd unt-grade-distribution && npx tsc --noEmit && npm run lint)
```

Automated tests cover missing/rotated installation IDs, spoofed headers, normalized IPv6, shared atomic quotas, concurrency/reset, error caching, preflight, all data route groups, normal instructor fanout, body limits, MCP batch rejection, and ordinary MCP calls. Unit tests do not prove the hosting network boundary.

Before approving a production rollout:

1. Configure the shared store and a preview-only namespace in an authorized Vercel preview. Do not test a low quota against the public production site
2. Temporarily set low preview quotas, request the manifest and a real blob/meta pair repeatedly (including warm cache hits), and verify 429 plus a positive `Retry-After` and `Cache-Control: private, no-store, max-age=0`. The denial body must contain no grades. Check both hostname aliases and different query strings
3. Repeat without `X-Install-ID`, with rotating values, with forged forwarding headers, and in concurrent clients. Budgets must not reset. Check returned `X-RateLimit-Remaining`
4. Verify normal site course/instructor/compare views, extension preflight and reads, MCP initialize/tools/list/single tools/call, and logging. Batch MCP POSTs must return 400; oversized MCP/log bodies must return 413 without data work
5. Simulate a store failure only in preview: protected routes should return 503, no grade data, no cached denial, and no silent in-memory fallback. Restore the backend and ensure reads recover
6. Restore intended budgets and verify the busiest instructor page and representative campus/NAT traffic. Review request/backend cost, privacy/retention, availability, and any provider plan limits before promotion
7. Promote only with the owner's deployment approval. This change must not be merged/deployed with missing shared-store configuration

References: [Next.js proxy order](https://nextjs.org/docs/app/api-reference/file-conventions/proxy#execution-order), [Vercel Routing Middleware](https://vercel.com/docs/routing-middleware), [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
