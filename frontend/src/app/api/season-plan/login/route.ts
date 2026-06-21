import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password, role: "group_leader" }),
  });

  if (!response.ok) {
    redirect(feedbackPath("/season-plan", "error", await responseError(response, "组长登录失败")));
  }

  const result = (await response.json()) as { token: string };
  const cookieStore = await cookies();
  cookieStore.set("printk-plan-token", result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect(feedbackPath("/season-plan", "ok", "已进入编辑模式"));
}
