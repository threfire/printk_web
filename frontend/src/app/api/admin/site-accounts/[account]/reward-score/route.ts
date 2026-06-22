import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { adminReturnPath, feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ account: string }> },
) {
  const adminPath = adminReturnPath(request, "/admin/rewards");
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";
  const { account } = await params;
  if (!token) {
    redirect(feedbackPath(adminPath, "error", "请先登录管理员后台"));
  }

  const form = await request.formData();
  const rewardScore = Number.parseInt(String(form.get("reward_score") ?? "0"), 10);
  if (!Number.isInteger(rewardScore) || rewardScore < 0) {
    redirect(feedbackPath(adminPath, "error", "奖励分格式错误"));
  }

  const response = await fetch(`${API_BASE}/api/admin/site-accounts/${encodeURIComponent(account)}/reward-score`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reward_score: rewardScore }),
  });

  if (!response.ok) {
    redirect(feedbackPath(adminPath, "error", await responseError(response, "奖励分保存失败")));
  }

  redirect(feedbackPath(adminPath, "ok", `账号 ${account} 奖励分已保存`));
}
