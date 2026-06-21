import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type QuoteRouteContext = {
  params: Promise<{ quoteId: string }>;
};

export async function POST(request: Request, { params }: QuoteRouteContext) {
  const [{ quoteId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) {
    redirect(feedbackPath("/admin", "error", "请先登录管理员后台"));
  }

  const endpoint = `${API_BASE}/api/admin/homepage/quotes/${encodeURIComponent(quoteId)}`;
  const intent = String(form.get("intent") ?? "save");
  const response =
    intent === "delete"
      ? await fetch(endpoint, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      : await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: String(form.get("text") ?? ""),
            source: String(form.get("source") ?? ""),
            display_order: Number(form.get("display_order") ?? 0),
            is_enabled: String(form.get("is_enabled") ?? "") === "true",
          }),
        });

  if (!response.ok) {
    redirect(feedbackPath("/admin", "error", await responseError(response, "首页文案保存失败")));
  }

  redirect(feedbackPath("/admin", "ok", intent === "delete" ? "首页文案已删除" : "首页文案已保存"));
}
