import { NextRequest, NextResponse } from "next/server";

function redirectTarget(request: NextRequest) {
  return request.headers.get("referer") ?? new URL("/", request.url).toString();
}

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(redirectTarget(request), 303);
  response.cookies.delete("printk-site-account");
  response.cookies.set("printk-account-feedback", "已退出账号", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 8,
  });

  return response;
}
