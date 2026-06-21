import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { profileFromForm } from "@/lib/account-profile";

function redirectTarget(request: NextRequest) {
  return request.headers.get("referer") ?? new URL("/account", request.url).toString();
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
  const account = request.cookies.get("printk-site-account")?.value ?? "";
  const response = NextResponse.redirect(redirectTarget(request), 303);

  if (!account) {
    setFeedback(response, "请先登录账号");
    return response;
  }

  const formData = await request.formData();
  const profile = profileFromForm(formData);
  const apiResponse = await fetch(`${API_BASE}/api/site-accounts/${encodeURIComponent(account)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!apiResponse.ok) {
    setFeedback(response, await responseError(apiResponse, "资料保存失败"));
    return response;
  }

  setFeedback(response, "个人资料已保存");
  return response;
}
