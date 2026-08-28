import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPagePrefixes = ["/account", "/admin", "/forum", "/image2", "/invoices"];
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isTestMode() {
  return (process.env.SITE_MODE || "full").trim().toLowerCase() === "test";
}

function writeApiEnabled() {
  if (isTestMode()) {
    return false;
  }
  const configured = process.env.ENABLE_WRITE_API;
  if (configured === undefined) {
    return true;
  }
  return ["1", "true", "yes", "on"].includes(configured.trim().toLowerCase());
}

function featureEnabled(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value || "").trim().toLowerCase());
}

function isHiddenFeaturePath(pathname: string) {
  const forumPaths = ["/forum", "/api/forum", "/admin/forum", "/api/admin/forum"];
  const image2Paths = ["/image2", "/api/image2"];
  const belongsTo = (prefixes: string[]) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (!featureEnabled(process.env.ENABLE_FORUM) && belongsTo(forumPaths)) ||
    (!featureEnabled(process.env.ENABLE_IMAGE2) && belongsTo(image2Paths));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const testMode = isTestMode();

  if (isHiddenFeaturePath(pathname)) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ detail: "feature hidden" }, { status: 404 })
      : NextResponse.redirect(new URL("/", request.url));
  }

  if (mutatingMethods.has(request.method) && !writeApiEnabled()) {
    return NextResponse.json({ detail: "feature disabled" }, { status: 503 });
  }

  if (testMode && protectedPagePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/admin/homepage/assets$|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
