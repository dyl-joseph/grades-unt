// Kept separate from rate-limit so route handlers can use it without importing
// the limiter (proxy.test.ts forbids rate-limit imports in routes).
export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};
