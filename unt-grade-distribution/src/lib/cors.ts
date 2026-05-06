import { NextRequest, NextResponse } from "next/server";

export function validateExtensionOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin") ?? "";
  if (origin.startsWith("chrome-extension://")) {
    const originId = origin.replace("chrome-extension://", "").replace(/\/.*$/, "");
    const extensionId = request.headers.get("x-extension-id") ?? "";
    if (extensionId && originId !== extensionId) {
      return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
    }
  }
  return null;
}
