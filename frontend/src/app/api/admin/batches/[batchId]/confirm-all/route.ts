import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const adminPath = adminReturnPath(_request, "/admin/materials");
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const { batchId } = await params;
  if (!token) {
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  const confirmResponse = await fetch(`${API_BASE}/api/invoices/batches/${batchId}/confirm-all`, {
    method: "POST",
    headers,
  });
  if (!confirmResponse.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(confirmResponse, "整批确认失败")));
  }
  const completeResponse = await fetch(`${API_BASE}/api/invoices/batches/${batchId}/complete`, {
    method: "POST",
    headers,
  });
  if (!completeResponse.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(completeResponse, "批次完成失败")));
  }
  redirect(feedbackPath(adminPath, "ok", `批次 ${batchId} 已整批确认`));
}
