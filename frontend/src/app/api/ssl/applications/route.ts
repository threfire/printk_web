import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";

export async function POST(request: Request) {
  const [form, cookieStore] = await Promise.all([request.formData(), cookies()]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  if (!account) redirect(feedbackPath("/ssl", "error", "请先注册并登录 PRINTK 战队账号"));

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/ssl/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_account: account,
        self_intro: String(form.get("self_intro") ?? ""),
        interview_direction: String(form.get("interview_direction") ?? ""),
        interview_time: String(form.get("interview_time") ?? ""),
      }),
    });
  } catch {
    redirect(feedbackPath("/ssl", "error", "申请服务暂时不可用，请稍后重试"));
  }
  if (!response.ok) redirect(feedbackPath("/ssl", "error", await responseError(response, "提交申请失败")));
  redirect(feedbackPath("/ssl", "ok", "面试申请已提交，请留意站内消息"));
}
