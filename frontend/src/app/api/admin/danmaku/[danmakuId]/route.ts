import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type RouteContext = {
  params: Promise<{ danmakuId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const [{ danmakuId }, form, cookieStore] = await Promise.all([params, request.formData(), cookies()]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) redirect(feedbackPath("/admin/danmaku", "error", "请先登录管理员后台"));

  const endpoint = `${API_BASE}/api/admin/homepage/danmaku/${encodeURIComponent(danmakuId)}`;
  const response = String(form.get("intent") ?? "review") === "delete"
    ? await fetch(endpoint, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    : await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: String(form.get("status") ?? "") }),
      });

  if (!response.ok) {
    redirect(feedbackPath("/admin/danmaku", "error", await responseError(response, "弹幕处理失败")));
  }
  redirect(feedbackPath("/admin/danmaku", "ok", "弹幕处理完成"));
}
