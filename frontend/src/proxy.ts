import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPagePrefixes = ["/account", "/admin", "/forum", "/image2", "/invoices"];
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isTestMode() {
  return (process.env.SITE_MODE || "test").trim().toLowerCase() === "test";
}

function writeApiEnabled() {
  if (isTestMode()) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes((process.env.ENABLE_WRITE_API || "").trim().toLowerCase());
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const testMode = isTestMode();

  if (mutatingMethods.has(request.method) && !writeApiEnabled()) {
    return NextResponse.json({ detail: "feature disabled" }, { status: 503 });
  }

  if (testMode && protectedPagePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
