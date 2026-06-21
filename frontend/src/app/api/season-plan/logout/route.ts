import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { feedbackPath } from "@/lib/admin-feedback";

async function clearPlanCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("printk-plan-token");
}

export async function GET() {
  await clearPlanCookie();
  redirect(feedbackPath("/season-plan", "ok", "已退出编辑模式"));
}

export async function POST() {
  await clearPlanCookie();
  redirect(feedbackPath("/season-plan", "ok", "已退出编辑模式"));
}
