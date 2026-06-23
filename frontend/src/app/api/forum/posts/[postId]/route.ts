import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type PostRouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: Request, { params }: PostRouteContext) {
  const [{ postId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const postPath = `/forum/${postId}`;

  if (!account) {
    redirect(feedbackPath(postPath, "error", "请先登录后再编辑帖子"));
  }

  let feedbackKey: "ok" | "error" = "error";
  let feedbackMessage = "论坛服务暂时不可用，请稍后重试";
  let targetPath = postPath;

  try {
    const response = await fetch(`${API_BASE}/api/forum/posts/${encodeURIComponent(postId)}`, {
      method: "PUT",
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
      feedbackMessage = await responseError(response, "编辑帖子失败");
    } else {
      feedbackKey = "ok";
      feedbackMessage = "帖子修改已提交，管理员审核通过后会重新展示";
      targetPath = "/forum";
    }
  } catch {
    feedbackMessage = "论坛服务暂时不可用，请稍后重试";
  }

  redirect(feedbackPath(targetPath, feedbackKey, feedbackMessage));
}
