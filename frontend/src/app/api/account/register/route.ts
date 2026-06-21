import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { profileFromForm } from "@/lib/account-profile";

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
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const profile = profileFromForm(formData);
  const response = NextResponse.redirect(redirectTarget(request), 303);

  if (!account || !password) {
    setFeedback(response, "请输入账号和密码");
    return response;
  }

  if (password !== confirmPassword) {
    setFeedback(response, "两次输入的密码不一致");
    return response;
  }

  const apiResponse = await fetch(`${API_BASE}/api/site-accounts/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ account, password, ...profile }),
  });

  if (!apiResponse.ok) {
    setFeedback(response, await responseError(apiResponse, "注册失败"));
    return response;
  }

  const result = (await apiResponse.json()) as { account: string };
  response.cookies.set("printk-site-account", result.account, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  setFeedback(response, `已注册并登录：${result.account}`);
  return response;
}
