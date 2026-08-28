import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";

export async function POST(request: Request) {
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  if (!token) return Response.json({ detail: "请先登录管理员后台" }, { status: 401 });
  const form = await request.formData();
  const response = await fetch(`${API_BASE}/api/admin/homepage/faqs`, {
    method: "POST",
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
