import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type TeamRouteContext = { params: Promise<{ teamId: string }> };

export async function POST(request: Request, { params }: TeamRouteContext) {
  const [{ teamId }, form, cookieStore] = await Promise.all([params, request.formData(), cookies()]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) redirect(feedbackPath("/admin/campus-competition", "error", "请先登录管理员后台"));

  const intent = String(form.get("intent") ?? "save");
  const endpoint = `${API_BASE}/api/admin/campus-competition/teams/${encodeURIComponent(teamId)}`;
  const body = new FormData();
  body.set("name", String(form.get("name") ?? ""));
  body.set("logo_url", String(form.get("logo_url") ?? ""));
  body.set("display_order", String(form.get("display_order") ?? 0));
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) body.set("logo", logo);
  const response = intent === "delete"
    ? await fetch(endpoint, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    : await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

  if (!response.ok) {
    redirect(feedbackPath("/admin/campus-competition", "error", await responseError(response, "参赛队保存失败")));
  }
  redirect(feedbackPath("/admin/campus-competition", "ok", intent === "delete" ? "参赛队已删除" : "参赛队已保存"));
}
