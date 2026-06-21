import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const { batchId } = await params;
  const form = await request.formData();
  const rowIds = form.getAll("row_ids").map(String).filter(Boolean);
  const note = String(form.get("note") ?? "").trim();
  const batchPath = `/admin/batches/${encodeURIComponent(batchId)}`;

  if (!token) {
    redirect(feedbackPath("/admin", "error", "请先登录管理员后台"));
  }
  if (rowIds.length === 0) {
    redirect(feedbackPath(batchPath, "error", "请选择需要驳回的明细"));
  }
  if (!note) {
    redirect(feedbackPath(batchPath, "error", "请填写驳回原因"));
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const rejectResponse = await fetch(`${API_BASE}/api/invoices/batches/${batchId}/reject-selected`, {
    method: "POST",
    headers,
    body: JSON.stringify({ row_ids: rowIds, note }),
  });
  if (!rejectResponse.ok) {
    redirect(feedbackPath(batchPath, "error", await responseError(rejectResponse, "驳回明细失败")));
  }

  const completeResponse = await fetch(`${API_BASE}/api/invoices/batches/${batchId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!completeResponse.ok && completeResponse.status !== 400) {
    redirect(feedbackPath(batchPath, "error", await responseError(completeResponse, "批次状态刷新失败")));
  }

  redirect(feedbackPath(batchPath, "ok", `已驳回 ${rowIds.length} 条明细`));
}
