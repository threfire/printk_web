import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type ReplyRouteContext = {
  params: Promise<{ replyId: string }>;
};

export async function POST(request: Request, { params }: ReplyRouteContext) {
  const [{ replyId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const inboxPath = "/forum/inbox";

  if (!account) {
    redirect(feedbackPath(inboxPath, "error", "请先登录后再编辑回复"));
  }

  let feedbackKey: "ok" | "error" = "error";
  let feedbackMessage = "论坛服务暂时不可用，请稍后重试";

  try {
    const response = await fetch(`${API_BASE}/api/forum/replies/${encodeURIComponent(replyId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: String(form.get("content") ?? ""),
        author_account: account,
      }),
    });

    if (!response.ok) {
      feedbackMessage = await responseError(response, "编辑回复失败");
    } else {
      feedbackKey = "ok";
      feedbackMessage = "回复已重新提交审核";
    }
  } catch {
    feedbackMessage = "论坛服务暂时不可用，请稍后重试";
  }

  redirect(feedbackPath(inboxPath, feedbackKey, feedbackMessage));
}
