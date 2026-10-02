import { NextRequest, NextResponse } from "next/server";
import { checkRequestLimit } from "./lib/rate-limit";

const LOCKED_EXTENSION_ID = process.env.CHROME_EXTENSION_ID ?? "";

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://untgrades.app" || origin === "https://www.untgrades.app") return true;
  if (origin.startsWith("chrome-extension://")) {
    const originId = origin.replace("chrome-extension://", "").replace(/\/.*$/, "");
    if (process.env.NODE_ENV !== "production") return true;
    if (LOCKED_EXTENSION_ID && originId === LOCKED_EXTENSION_ID) return true;
    if (!LOCKED_EXTENSION_ID) return true;
  }
  return false;
}

function corsHeaders(request: NextRequest): Headers {
  const isMcp = request.nextUrl.pathname === "/api/mcp";
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers();
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", isMcp ? "GET, POST, DELETE, OPTIONS" : "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", isMcp ? "Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID" : "Content-Type, X-Extension-ID, X-Install-ID");
  headers.set("Access-Control-Expose-Headers", "Retry-After, X-RateLimit-Remaining, MCP-Session-Id");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export async function proxy(request: NextRequest) {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // This is the single enforcement point, before handlers AND static/CDN reads.
  // Never trust a client-supplied "already checked" header or charge in routes too.
  const { headers, rejection } = await checkRequestLimit(request);
  const response = rejection ?? NextResponse.next();
  for (const [name, value] of headers) response.headers.set(name, value);
  if (request.nextUrl.pathname.startsWith("/api/")) {
    for (const [name, value] of cors) response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/encrypted/:path*", "/:path(.*%.*)"],
};
