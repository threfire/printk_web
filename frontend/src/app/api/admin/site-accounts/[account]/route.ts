import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";
import { profileFromForm } from "@/lib/account-profile";

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
  const payload = {
    ...profileFromForm(form),
    image2_allowed: String(form.get("image2_allowed") ?? "") === "true",
    is_disabled: String(form.get("is_disabled") ?? "") === "true",
    admin_note: String(form.get("admin_note") ?? "").trim(),
  };
  const response = await fetch(`${API_BASE}/api/admin/site-accounts/${encodeURIComponent(account)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    redirect(feedbackPath("/admin", "error", await responseError(response, "账号保存失败")));
  }

  redirect(feedbackPath("/admin", "ok", `账号 ${account} 已保存`));
}
