import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const form = await request.formData();
  const currentPath = String(form.get("return_to") ?? "/admin");
  const password = String(form.get("password") ?? "");
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password, role: "admin" }),
  });

  if (!response.ok) {
    redirect(feedbackPath(currentPath, "error", await responseError(response, "管理员登录失败")));
  }

  const result = (await response.json()) as { token: string };
  const cookieStore = await cookies();
  cookieStore.set("printk-admin-token", result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect(feedbackPath(currentPath, "ok", "管理员登录成功"));
}
