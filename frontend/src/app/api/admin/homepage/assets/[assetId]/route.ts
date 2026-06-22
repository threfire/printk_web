import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError, wantsJsonResponse } from "@/lib/admin-feedback";

type AssetRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(request: Request, { params }: AssetRouteContext) {
  const adminPath = adminReturnPath(request, "/admin/homepage");
  const wantsJson = wantsJsonResponse(request);
  const [{ assetId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) {
    if (wantsJson) {
      return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
    }
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
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
    if (wantsJson) {
      return Response.json({ detail: await responseError(response, "首页媒体保存失败") }, { status: response.status });
    }
    redirect(feedbackPath(adminPath, "error", await responseError(response, "首页媒体保存失败")));
  }

  if (wantsJson) {
    return Response.json(await response.json().catch(() => ({})), { status: response.status });
  }

  redirect(feedbackPath(adminPath, "ok", intent === "delete" ? "首页媒体已删除" : "首页媒体已保存"));
}
