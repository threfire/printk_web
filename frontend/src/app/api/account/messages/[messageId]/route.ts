import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api";

async function removeMessage({ params }: { params: Promise<{ messageId: string }> }) {
  const account = (await cookies()).get("printk-site-account")?.value ?? "";
  if (!account) return Response.json({ detail: "请先登录账号" }, { status: 401 });
  const { messageId } = await params;
  const response = await fetch(`${API_BASE}/api/site-messages/${encodeURIComponent(account)}/${encodeURIComponent(messageId)}`, { method: "DELETE" });
  return Response.json(await response.json().catch(() => ({})), { status: response.status });
}

export async function DELETE(_: Request, context: { params: Promise<{ messageId: string }> }) { return removeMessage(context); }
export async function POST(_: Request, context: { params: Promise<{ messageId: string }> }) { return removeMessage(context); }
