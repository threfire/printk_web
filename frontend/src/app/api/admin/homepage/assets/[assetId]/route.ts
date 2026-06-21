import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type AssetRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(request: Request, { params }: AssetRouteContext) {
  const [{ assetId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) {
    redirect(feedbackPath("/admin", "error", "请先登录管理员后台"));
  }

  const endpoint = `${API_BASE}/api/admin/homepage/assets/${encodeURIComponent(assetId)}`;
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
            alt: String(form.get("alt") ?? ""),
            display_order: Number(form.get("display_order") ?? 0),
            is_enabled: String(form.get("is_enabled") ?? "") === "true",
          }),
        });

  if (!response.ok) {
    redirect(feedbackPath("/admin", "error", await responseError(response, "首页媒体保存失败")));
  }

  redirect(feedbackPath("/admin", "ok", intent === "delete" ? "首页媒体已删除" : "首页媒体已保存"));
}
