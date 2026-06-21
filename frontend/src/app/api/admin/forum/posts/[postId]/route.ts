import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type PostRouteContext = {
  params: Promise<{ postId: string }>;
};

function optionalBoolean(value: FormDataEntryValue | null) {
  if (value === null || value === "") {
    return undefined;
  }
  return String(value) === "true";
}

export async function POST(request: Request, { params }: PostRouteContext) {
  const [{ postId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  const adminPath = "/admin";
  if (!token) {
    redirect(feedbackPath("/admin", "error", "请先登录管理员后台"));
  }

  const intent = String(form.get("intent") ?? "moderate");
  const endpoint = `${API_BASE}/api/admin/forum/posts/${encodeURIComponent(postId)}`;
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
            is_pinned: optionalBoolean(form.get("is_pinned")),
            is_locked: optionalBoolean(form.get("is_locked")),
          }),
        });

  if (!response.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(response, "论坛帖子处理失败")));
  }

  redirect(feedbackPath(adminPath, "ok", "论坛帖子处理完成"));
}
