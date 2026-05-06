const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const INSTALL_LIMIT = 100;
const INSTALL_WINDOW_MS = 60_000;

export function rateLimit(
  key: string,
  limit: number = INSTALL_LIMIT,
  windowMs: number = INSTALL_WINDOW_MS
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

export function checkInstallRateLimit(
  request: NextRequest
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const installId = request.headers.get("x-install-id");
  if (!installId) return { allowed: true, remaining: INSTALL_LIMIT };

  const result = rateLimit(`install:${installId}`);

  if (rateLimitMap.size > 10_000) {
    const cutoff = Date.now();
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < cutoff) rateLimitMap.delete(k);
    }
  }

  return result;
}

import type { NextRequest } from "next/server";
