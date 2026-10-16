import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) redirect(feedbackPath("/admin/campus-competition", "error", "请先登录管理员后台"));

  const form = await request.formData();
  const response = await fetch(`${API_BASE}/api/admin/campus-competition/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: String(form.get("name") ?? ""),
      logo_url: String(form.get("logo_url") ?? ""),
      display_order: Number(form.get("display_order") ?? 0),
    }),
  });

  if (!response.ok) {
    redirect(feedbackPath("/admin/campus-competition", "error", await responseError(response, "参赛队添加失败")));
  }
  redirect(feedbackPath("/admin/campus-competition", "ok", "参赛队已添加"));
}
