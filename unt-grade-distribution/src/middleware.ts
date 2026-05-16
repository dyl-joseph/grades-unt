import { NextRequest, NextResponse } from "next/server";

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
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers();
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Extension-ID, X-Install-ID");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
  }

  const response = NextResponse.next();
  const origin = request.headers.get("origin") ?? "";
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Extension-ID, X-Install-ID");
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
