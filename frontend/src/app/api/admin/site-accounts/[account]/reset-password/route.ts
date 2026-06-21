import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ account: string }> },
) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const { account } = await params;
  if (!token) {
    redirect(feedbackPath("/admin", "error", "请先登录管理员后台"));
  }

  const form = await request.formData();
  const newPassword = String(form.get("new_password") ?? "");
  if (!newPassword) {
    redirect(feedbackPath("/admin", "error", "请输入新密码"));
  }

  const response = await fetch(`${API_BASE}/api/admin/site-accounts/${encodeURIComponent(account)}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ new_password: newPassword }),
  });

  if (!response.ok) {
    redirect(feedbackPath("/admin", "error", await responseError(response, "密码重置失败")));
  }

  redirect(feedbackPath("/admin", "ok", `账号 ${account} 密码已重置`));
}
