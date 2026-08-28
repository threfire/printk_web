import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";

export async function DELETE(_: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) return Response.json({ detail: "请先登录管理后台" }, { status: 401 });
  const { questionId } = await params;
  const response = await fetch(`${API_BASE}/api/admin/homepage/recruitment-questions/${encodeURIComponent(questionId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return Response.json(await response.json().catch(() => ({})), { status: response.status });
}
