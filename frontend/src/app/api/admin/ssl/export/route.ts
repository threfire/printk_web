import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) redirect(feedbackPath("/admin/ssl", "error", "请先登录管理员后台"));

  const response = await fetch(`${API_BASE}/api/admin/ssl/applications/export.csv`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) redirect(feedbackPath("/admin/ssl", "error", await responseError(response, "导出失败")));
  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "Content-Disposition": response.headers.get("content-disposition") ?? "attachment; filename=ssl-interviews.csv",
    },
  });
}
