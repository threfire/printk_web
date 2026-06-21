import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import type { SiteAccountProfile } from "@/lib/account-profile";

const allowedImage2MemberStatuses = new Set(["梯队队员", "正式队员", "老队员", "老师"]);

export type Image2AccessState = {
  allowed: boolean;
  status: 200 | 401 | 403;
  message: string;
};

export async function image2AccessState(request: NextRequest): Promise<Image2AccessState> {
  const account = request.cookies.get("printk-site-account")?.value?.trim() ?? "";
  if (!account) {
    return { allowed: false, status: 401, message: "请先注册账号并登录后再使用图生成工具" };
  }

  const response = await fetch(`${API_BASE}/api/site-accounts/${encodeURIComponent(account)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return { allowed: false, status: 401, message: "账号资料读取失败，请重新登录" };
  }

  const profile = (await response.json()) as SiteAccountProfile;
  if (!allowedImage2MemberStatuses.has(profile.member_status)) {
    return { allowed: false, status: 403, message: "当前身份无权使用图生成工具" };
  }

  return { allowed: true, status: 200, message: "已获得图生成工具权限" };
}

export async function requireImage2User(request: NextRequest) {
  const access = await image2AccessState(request);
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }
  return null;
}
