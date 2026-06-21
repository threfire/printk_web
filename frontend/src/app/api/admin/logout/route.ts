import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { feedbackPath } from "@/lib/admin-feedback";

async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("printk-admin-token");
}

export async function GET() {
  await clearAdminCookie();
  redirect(feedbackPath("/admin", "ok", "已退出管理员后台"));
}

export async function POST() {
  await clearAdminCookie();
  redirect(feedbackPath("/admin", "ok", "已退出管理员后台"));
}
