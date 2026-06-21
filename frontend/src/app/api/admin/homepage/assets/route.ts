import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) {
    redirect(feedbackPath("/admin", "error", "请先登录管理员后台"));
  }

  const form = await request.formData();
  const response = await fetch(`${API_BASE}/api/admin/homepage/assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    redirect(feedbackPath("/admin", "error", await responseError(response, "首页媒体上传失败")));
  }

  redirect(feedbackPath("/admin", "ok", "首页媒体已上传"));
}
