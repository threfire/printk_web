import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const [form, cookieStore] = await Promise.all([request.formData(), cookies()]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";

  if (!account) {
    redirect(feedbackPath("/market", "error", "请先登录后再发布闲置物品"));
  }

  let feedbackKey: "ok" | "error" = "error";
  let feedbackMessage = "闲置物品展示服务暂时不可用，请稍后重试";
  let targetPath = "/market";

  try {
    const response = await fetch(`${API_BASE}/api/market/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        image_src: String(form.get("image_src") ?? ""),
        location: String(form.get("location") ?? ""),
        summary: String(form.get("summary") ?? ""),
        detail: String(form.get("detail") ?? ""),
        contact: String(form.get("contact") ?? ""),
        tags: String(form.get("tags") ?? ""),
        author_account: account,
      }),
    });

    if (!response.ok) {
      feedbackMessage = await responseError(response, "闲置物品发布失败");
    } else {
      const data = (await response.json()) as { item?: { id?: string } };
      feedbackKey = "ok";
      feedbackMessage = "闲置物品已发布";
      if (data.item?.id) {
        targetPath = `/market/${data.item.id}`;
      }
    }
  } catch {
    feedbackMessage = "闲置物品展示服务暂时不可用，请稍后重试";
  }

  redirect(feedbackPath(targetPath, feedbackKey, feedbackMessage));
}
