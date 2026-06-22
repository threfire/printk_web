import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const adminPath = adminReturnPath(_request, "/admin/materials");
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const { recordId } = await params;
  if (!token) {
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }
  const response = await fetch(`${API_BASE}/api/invoices/reimburse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ record_ids: [recordId] }),
  });
  if (!response.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(response, "提取出库失败")));
  }
  const body = (await response.json().catch(() => ({ reimbursement_id: "" }))) as { reimbursement_id?: string };
  redirect(feedbackPath(adminPath, "ok", `出库完成，报销批次 ${body.reimbursement_id ?? "-"}`));
}
