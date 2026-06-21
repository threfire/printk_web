import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const form = await request.formData();
  const cookieStore = await cookies();
  const account = cookieStore.get("printk-site-account")?.value ?? "";

  if (!account) {
    redirect(feedbackPath("/forum", "error", "请先登录后再发布帖子"));
  }

  const response = await fetch(`${API_BASE}/api/forum/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: String(form.get("title") ?? ""),
      content: String(form.get("content") ?? ""),
      author_account: account,
    }),
  });

  if (!response.ok) {
    redirect(feedbackPath("/forum", "error", await responseError(response, "发布帖子失败")));
  }

  const result = (await response.json()) as { id: string };
  redirect(feedbackPath(`/forum/${result.id}`, "ok", "帖子已发布"));
}
