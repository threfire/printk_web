import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError, wantsJsonResponse } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const adminPath = adminReturnPath(request, "/admin/homepage");
  const wantsJson = wantsJsonResponse(request);
  const [form, cookieStore] = await Promise.all([request.formData(), cookies()]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) {
    if (wantsJson) return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }

  const response = await fetch(`${API_BASE}/api/admin/homepage/campus-banner`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      text: String(form.get("text") ?? ""),
      action_text: String(form.get("action_text") ?? ""),
      is_enabled: String(form.get("is_enabled") ?? "") === "true",
    }),
  });

  if (!response.ok) {
    const detail = await responseError(response, "校内赛公告栏保存失败");
    if (wantsJson) return Response.json({ detail }, { status: response.status });
    redirect(feedbackPath(adminPath, "error", detail));
  }
  if (wantsJson) return Response.json(await response.json(), { status: response.status });
  redirect(feedbackPath(adminPath, "ok", "校内赛公告栏已保存"));
}
