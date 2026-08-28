import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";

export async function POST(request: Request) {
  const account = (await cookies()).get("printk-site-account")?.value ?? "";
  if (!account) return Response.json({ detail: "请先登录账号" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_BASE}/api/homepage/recruitment-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author_account: account, content: String(body.content ?? "") }),
  });
  return Response.json(await response.json().catch(() => ({})), { status: response.status });
}
