import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const [{ applicationId }, form, cookieStore] = await Promise.all([params, request.formData(), cookies()]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) redirect(feedbackPath("/admin/ssl", "error", "请先登录管理员后台"));

  const response = await fetch(`${API_BASE}/api/admin/ssl/applications/${encodeURIComponent(applicationId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      status: String(form.get("status") ?? ""),
      interview_location: String(form.get("interview_location") ?? ""),
      rejection_reason: String(form.get("rejection_reason") ?? ""),
    }),
  });
  if (!response.ok) redirect(feedbackPath("/admin/ssl", "error", await responseError(response, "审核失败")));
  redirect(feedbackPath("/admin/ssl", "ok", "审核完成，站内消息已发送"));
}
