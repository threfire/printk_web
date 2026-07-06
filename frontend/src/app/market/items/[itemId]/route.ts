import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

type MarketItemRouteContext = {
  params: Promise<{ itemId: string }>;
};

function statusFromIntent(intent: string) {
  if (intent === "sold") {
    return "sold";
  }
  if (intent === "delist") {
    return "delisted";
  }
  if (intent === "relist") {
    return "available";
  }
  return "";
}

export async function POST(request: Request, { params }: MarketItemRouteContext) {
  const [{ itemId }, form, cookieStore] = await Promise.all([
    params,
    request.formData(),
    cookies(),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const itemPath = `/market/${itemId}`;

  if (!account) {
    redirect(feedbackPath(itemPath, "error", "请先登录后再处理闲置物品"));
  }

  const intent = String(form.get("intent") ?? "update");
  const status = statusFromIntent(intent);
  const endpoint = status
    ? `${API_BASE}/api/market/items/${encodeURIComponent(itemId)}/status`
    : `${API_BASE}/api/market/items/${encodeURIComponent(itemId)}`;
  const payload = status
    ? {
        status,
        author_account: account,
      }
    : {
        name: String(form.get("name") ?? ""),
        image_src: String(form.get("image_src") ?? ""),
        location: String(form.get("location") ?? ""),
        summary: String(form.get("summary") ?? ""),
        detail: String(form.get("detail") ?? ""),
        contact: String(form.get("contact") ?? ""),
        tags: String(form.get("tags") ?? ""),
        author_account: account,
      };

  let feedbackKey: "ok" | "error" = "error";
  let feedbackMessage = "闲置物品展示服务暂时不可用，请稍后重试";

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      feedbackMessage = await responseError(response, "闲置物品处理失败");
    } else {
      feedbackKey = "ok";
      feedbackMessage =
        intent === "sold"
          ? "物品已标记为已出"
          : intent === "delist"
            ? "物品已下架"
            : intent === "relist"
              ? "物品已重新上架"
              : "物品信息已保存";
    }
  } catch {
    feedbackMessage = "闲置物品展示服务暂时不可用，请稍后重试";
  }

  redirect(feedbackPath(itemPath, feedbackKey, feedbackMessage));
}
