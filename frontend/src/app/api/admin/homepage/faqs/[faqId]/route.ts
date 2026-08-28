import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";

async function adminToken() {
  return (await cookies()).get("printk-admin-token")?.value ?? "";
}

export async function PUT(request: Request, { params }: { params: Promise<{ faqId: string }> }) {
  const token = await adminToken();
  if (!token) return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
  const [form, { faqId }] = await Promise.all([request.formData(), params]);
  const response = await fetch(`${API_BASE}/api/admin/homepage/faqs/${encodeURIComponent(faqId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      question: String(form.get("question") ?? ""),
      answer: String(form.get("answer") ?? ""),
      display_order: Number(form.get("display_order") ?? 0),
      is_enabled: String(form.get("is_enabled") ?? "") === "true",
    }),
  });
  return Response.json(await response.json().catch(() => ({})), { status: response.status });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ faqId: string }> }) {
  const token = await adminToken();
  if (!token) return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
  const { faqId } = await params;
  const response = await fetch(`${API_BASE}/api/admin/homepage/faqs/${encodeURIComponent(faqId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return Response.json(await response.json().catch(() => ({})), { status: response.status });
}
