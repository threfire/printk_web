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
  const editorAccount = cookieStore.get("printk-site-account")?.value ?? "";
  const currentPeriod = getCurrentSeasonPlanPeriod();
  const seasonYear = readNumber(form, "season_year", currentPeriod.seasonYear);
  const month = readNumber(form, "month", currentPeriod.month);
  const planPath = `/season-plan?season_year=${seasonYear}&month=${month}`;

  if (!editorAccount) {
    redirect(feedbackPath(planPath, "error", "请先登录账号"));
  }

  const count = readNumber(form, "count", 0);
  const plans: SeasonPlanItem[] = [];
  for (let index = 0; index < count; index += 1) {
    const taskTitle = String(form.get(`task_title_${index}`) ?? "").trim();
    const target = String(form.get(`target_${index}`) ?? "").trim();
    const assigneeAccount = String(form.get(`assignee_account_${index}`) ?? "").trim();
    if (!taskTitle && !target && !assigneeAccount) {
      continue;
    }
    plans.push({
      robot_type: String(form.get(`robot_type_${index}`) ?? ""),
      task_title: taskTitle,
      status: String(form.get(`status_${index}`) ?? ""),
      target,
      assignee_account: assigneeAccount,
      is_completed: String(form.get(`is_completed_${index}`) ?? "") === "true",
    });
  }

  const response = await fetch(`${API_BASE}/api/season-plan`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      season_year: seasonYear,
      month,
      editor_account: editorAccount,
      plans,
    }),
  });

  if (response.status === 401 || response.status === 403) {
    redirect(feedbackPath(planPath, "error", await responseError(response, "当前账号没有编辑权限")));
  }

  if (!response.ok) {
    redirect(feedbackPath(planPath, "error", await responseError(response, "保存计划失败")));
  }

  redirect(feedbackPath(planPath, "ok", "赛季计划已保存"));
}
