import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError, wantsJsonResponse } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const adminPath = adminReturnPath(request, "/admin/homepage");
  const wantsJson = wantsJsonResponse(request);
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) {
    if (wantsJson) {
      return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
    }
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }

  const form = await request.formData();
  const response = await fetch(`${API_BASE}/api/admin/homepage/quotes`, {
    method: "POST",
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
    if (wantsJson) {
      return Response.json({ detail: await responseError(response, "首页文案新建失败") }, { status: response.status });
    }
    redirect(feedbackPath(adminPath, "error", await responseError(response, "首页文案新建失败")));
  }

  if (wantsJson) {
    return Response.json(await response.json().catch(() => ({})), { status: response.status });
  }

  redirect(feedbackPath(adminPath, "ok", "首页文案已新建"));
}
