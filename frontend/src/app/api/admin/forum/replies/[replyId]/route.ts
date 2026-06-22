import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError } from "@/lib/admin-feedback";

type ReplyRouteContext = {
  params: Promise<{ replyId: string }>;
};

export async function POST(request: Request, { params }: ReplyRouteContext) {
  const adminPath = adminReturnPath(request, "/admin/forum");
  const [{ replyId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);  
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  if (!token) {
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }

  const intent = String(form.get("intent") ?? "moderate");
  const endpoint = `${API_BASE}/api/admin/forum/replies/${encodeURIComponent(replyId)}`;
  const response =
    intent === "delete"
      ? await fetch(endpoint, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      : await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: String(form.get("status") ?? "pending"),
            reject_reason: String(form.get("reject_reason") ?? ""),
          }),
        });

  if (!response.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(response, "论坛回复处理失败")));
  }

  redirect(feedbackPath(adminPath, "ok", "论坛回复处理完成"));
}
