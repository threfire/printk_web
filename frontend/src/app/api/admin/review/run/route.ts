import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST() {
  const adminPath = "/admin";
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) {
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }
  const response = await fetch(`${API_BASE}/api/invoices/review/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(response, "审核扫描失败")));
  }
  const body = (await response.json().catch(() => ({ processed: 0 }))) as { processed?: number };
  redirect(feedbackPath(adminPath, "ok", `审核扫描完成，处理 ${body.processed ?? 0} 个批次`));
}
