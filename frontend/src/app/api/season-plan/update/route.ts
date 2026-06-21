import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, SeasonPlanItem } from "@/lib/api";
import { feedbackPath, responseError } from "@/lib/admin-feedback";
import { getCurrentSeasonPlanPeriod } from "@/lib/season-plan-period";

function readNumber(form: FormData, key: string, fallback: number) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const cookieStore = await cookies();
  const token = cookieStore.get("printk-plan-token")?.value ?? "";
  const currentPeriod = getCurrentSeasonPlanPeriod();

  if (!token) {
    redirect(feedbackPath("/season-plan", "error", "请先登录组长编辑模式"));
  }

  const count = readNumber(form, "count", 0);
  const plans: SeasonPlanItem[] = [];
  for (let index = 0; index < count; index += 1) {
    plans.push({
      group_name: String(form.get(`group_name_${index}`) ?? ""),
      status: String(form.get(`status_${index}`) ?? ""),
      target: String(form.get(`target_${index}`) ?? ""),
    });
  }

  const response = await fetch(`${API_BASE}/api/season-plan`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      season_year: readNumber(form, "season_year", currentPeriod.seasonYear),
      month: readNumber(form, "month", currentPeriod.month),
      plans,
    }),
  });

  if (response.status === 401 || response.status === 403) {
    cookieStore.delete("printk-plan-token");
    redirect(feedbackPath("/season-plan", "error", "编辑登录已失效，请重新登录"));
  }

  if (!response.ok) {
    redirect(feedbackPath("/season-plan", "error", await responseError(response, "保存计划失败")));
  }

  redirect(feedbackPath("/season-plan", "ok", "赛季计划已保存"));
}
