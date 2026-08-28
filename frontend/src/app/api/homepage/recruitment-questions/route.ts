import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";

export async function POST(request: Request) {
  const account = (await cookies()).get("printk-site-account")?.value ?? "";
  if (!account) return Response.json({ detail: "请先登录账号" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return Response.json({ detail: "请输入招新问题" }, { status: 400 });
  try {
    const response = await fetch(`${API_BASE}/api/homepage/recruitment-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_account: account, content }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = result?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item: { msg?: string; message?: string } | string) => typeof item === "string" ? item : item.msg || item.message || "请求参数无效").join("；")
        : typeof detail === "string" ? detail : "提交失败";
      return Response.json({ detail: message }, { status: response.status });
    }
    return Response.json(result, { status: response.status });
  } catch {
    return Response.json({ detail: "提问服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}
