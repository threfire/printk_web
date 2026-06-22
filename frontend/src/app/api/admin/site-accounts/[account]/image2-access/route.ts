import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ account: string }> },
) {
  const adminPath = adminReturnPath(request, "/admin/accounts");
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const { account } = await params;
  if (!token) {
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }

  const form = await request.formData();
  const image2Allowed = String(form.get("image2_allowed") ?? "") === "true";
  const response = await fetch(`${API_BASE}/api/admin/site-accounts/${encodeURIComponent(account)}/image2-access`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image2_allowed: image2Allowed }),
  });

  if (!response.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(response, "图片工具权限更新失败")));
  }

  redirect(feedbackPath(adminPath, "ok", image2Allowed ? "图片工具权限已添加" : "图片工具权限已移除"));
}
