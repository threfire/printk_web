import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

function setFeedback(response: NextResponse, message: string) {
  response.cookies.set("printk-account-feedback", message, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 8,
  });
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({ detail: "个人照片上传失败" }));
  return String(body.detail ?? "个人照片上传失败");
}

export async function POST(request: NextRequest) {
  const account = request.cookies.get("printk-site-account")?.value ?? "";
  const redirectResponse = NextResponse.redirect(new URL("/account", request.url), 303);
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  if (!account) {
    if (wantsJson) return Response.json({ detail: "请先登录账号" }, { status: 401 });
    setFeedback(redirectResponse, "请先登录账号");
    return redirectResponse;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data") || !request.body) {
    if (wantsJson) return Response.json({ detail: "请选择个人照片" }, { status: 400 });
    setFeedback(redirectResponse, "请选择个人照片");
    return redirectResponse;
  }

  try {
    const uploadRequest: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: request.body,
      duplex: "half",
    };
    const apiResponse = await fetch(
      `${API_BASE}/api/site-accounts/${encodeURIComponent(account)}/photo`,
      uploadRequest,
    );
    if (!apiResponse.ok) {
      if (wantsJson) return Response.json({ detail: await responseError(apiResponse) }, { status: apiResponse.status });
      setFeedback(redirectResponse, await responseError(apiResponse));
      return redirectResponse;
    }
  } catch {
    if (wantsJson) return Response.json({ detail: "个人照片上传失败" }, { status: 502 });
    setFeedback(redirectResponse, "个人照片上传失败");
    return redirectResponse;
  }

  if (wantsJson) return Response.json({ ok: true });
  setFeedback(redirectResponse, "个人照片已上传");
  return redirectResponse;
}
