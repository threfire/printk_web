import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

function redirectTarget(request: NextRequest) {
  return request.headers.get("referer") ?? new URL("/", request.url).toString();
}

function setFeedback(response: NextResponse, message: string) {
  response.cookies.set("printk-account-feedback", message, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 8,
  });
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({ detail: fallback }));
  return String(body.detail ?? fallback);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const account = String(formData.get("account") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const response = NextResponse.redirect(redirectTarget(request), 303);

  if (!account || !password) {
    setFeedback(response, "请输入账号和密码");
    return response;
  }

  const apiResponse = await fetch(`${API_BASE}/api/site-accounts/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ account, password }),
  });

  if (!apiResponse.ok) {
    setFeedback(response, await responseError(apiResponse, "账号或密码错误"));
    return response;
  }

  const result = (await apiResponse.json()) as { account: string };
  response.cookies.set("printk-site-account", result.account, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  setFeedback(response, `已登录：${result.account}`);
  return response;
}
