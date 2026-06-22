import Link from "next/link";
import { cookies } from "next/headers";
import { API_BASE, SeasonPlanData, SeasonPlanItem } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";
import { SiteAccountProfile } from "@/lib/account-profile";
import {
  formatSeasonPlanTitle,
  getCurrentSeasonPlanPeriod,
  SeasonPlanPeriod,
} from "@/lib/season-plan-period";

type SeasonPlanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const robotTypes = ["英雄兵种", "步兵兵种", "工程兵种", "哨兵兵种"] as const;
const planEditorStatuses = new Set(["兵种组长", "队长", "管理员", "老师"]);

const emptyProfile: SiteAccountProfile = {
  account: "",
  full_name: "",
  gender: "",
  grade: "",
  member_status: "",
  department: "",
  phone: "",
  email: "",
  bio: "",
  reward_score: 0,
  reward_eligible: false,
  image2_allowed: false,
  is_disabled: false,
};

function readPeriod(query: Record<string, string | string[] | undefined>): SeasonPlanPeriod {
  const currentPeriod = getCurrentSeasonPlanPeriod();
  const seasonYear = Number(firstParam(query.season_year));
  const month = Number(firstParam(query.month));
  return {
    seasonYear: Number.isFinite(seasonYear) ? seasonYear : currentPeriod.seasonYear,
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : currentPeriod.month,
  };
}

async function fetchSeasonPlan(period: SeasonPlanPeriod): Promise<SeasonPlanData> {
  try {
    const response = await fetch(
      `${API_BASE}/api/season-plan?season_year=${period.seasonYear}&month=${period.month}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return { season_year: period.seasonYear, month: period.month, plans: [] };
    }
    return response.json() as Promise<SeasonPlanData>;
  } catch {
    return { season_year: period.seasonYear, month: period.month, plans: [] };
  }
}

async function fetchProfile(account: string): Promise<SiteAccountProfile> {
  if (!account) {
    return emptyProfile;
  }
  try {
    const response = await fetch(`${API_BASE}/api/site-accounts/${encodeURIComponent(account)}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { ...emptyProfile, account };
    }
    return response.json() as Promise<SiteAccountProfile>;
  } catch {
    return { ...emptyProfile, account };
  }
}

function monthOptions() {
  return Array.from({ length: 12 }, (_, index) => index + 1);
}

function PlanCard({ plan }: { plan: SeasonPlanItem }) {
  return (
    <li className={`plan-task ${plan.is_completed ? "plan-task-done" : ""}`}>
      <div className="plan-task-check" aria-hidden="true">
        {plan.is_completed ? "✓" : ""}
      </div>
      <div>
        <span className="badge">{plan.robot_type}</span>
        <h3>{plan.task_title}</h3>
        <p>{plan.target}</p>
        <div className="plan-task-meta">
          <span>{plan.status}</span>
          <span>{plan.assignee_account ? `执行人：${plan.assignee_account}` : "执行人待指派"}</span>
        </div>
      </div>
    </li>
  );
}

function emptyPlan(index: number): SeasonPlanItem {
  return {
    robot_type: robotTypes[index % robotTypes.length],
    task_title: "",
    status: "准备中",
    target: "",
    assignee_account: "",
    is_completed: false,
  };
}

function PlanEditor({ plans, period }: { plans: SeasonPlanItem[]; period: SeasonPlanPeriod }) {
  const editablePlans = plans.length > 0 ? plans : robotTypes.map((_, index) => emptyPlan(index));
  const rows = [...editablePlans, ...Array.from({ length: 4 }, (_, index) => emptyPlan(index))];

  return (
    <form className="form plan-editor" action="/season-plan/update" method="post">
      <input name="season_year" type="hidden" value={period.seasonYear} />
      <input name="month" type="hidden" value={period.month} />
      <input name="count" type="hidden" value={rows.length} />
      <div className="plan-editor-list">
        {rows.map((plan, index) => (
          <article className="plan-editor-row" key={`${plan.id ?? "new"}-${index}`}>
            <label className="plan-check" htmlFor={`is_completed_${index}`}>
              <input
                id={`is_completed_${index}`}
                name={`is_completed_${index}`}
                type="checkbox"
                value="true"
                defaultChecked={plan.is_completed}
              />
              完成
            </label>
            <div className="field">
              <label htmlFor={`robot_type_${index}`}>兵种</label>
              <select id={`robot_type_${index}`} name={`robot_type_${index}`} defaultValue={plan.robot_type}>
                {robotTypes.map((robotType) => (
                  <option value={robotType} key={robotType}>
                    {robotType}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`task_title_${index}`}>任务</label>
              <input id={`task_title_${index}`} name={`task_title_${index}`} defaultValue={plan.task_title} />
            </div>
            <div className="field">
              <label htmlFor={`assignee_account_${index}`}>执行人账号</label>
              <input
                id={`assignee_account_${index}`}
                name={`assignee_account_${index}`}
                defaultValue={plan.assignee_account}
              />
            </div>
            <div className="field">
              <label htmlFor={`status_${index}`}>状态</label>
              <input id={`status_${index}`} name={`status_${index}`} defaultValue={plan.status} />
            </div>
            <div className="field plan-target-field">
              <label htmlFor={`target_${index}`}>规划内容</label>
              <textarea id={`target_${index}`} name={`target_${index}`} defaultValue={plan.target} rows={3} />
            </div>
          </article>
        ))}
      </div>
      <div className="form-actions">
        <button className="button" type="submit">
          保存清单
        </button>
      </div>
    </form>
  );
}

export default async function SeasonPlanPage({ searchParams }: SeasonPlanPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const query = await (searchParams ?? Promise.resolve(emptyQuery));
  const period = readPeriod(query);
  const currentMonthTitle = formatSeasonPlanTitle(period);
  const cookieStore = await cookies();
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const [planData, profile] = await Promise.all([
    fetchSeasonPlan(period),
    fetchProfile(account),
  ]);
  const canEdit = Boolean(account) && planEditorStatuses.has(profile.member_status) && !profile.is_disabled;
  const hasPlans = planData.plans.length > 0;
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">SEASON PLAN</span>
        <h1>赛季月度规划</h1>
        <p>{currentMonthTitle}按兵种拆成任务清单，拥有兵种组长身份及以上权限的账号可编辑。</p>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        <form className="inline-login" action="/season-plan" method="get">
          <label htmlFor="season-year">赛季年份</label>
          <input id="season-year" name="season_year" type="number" min={2020} max={2100} defaultValue={period.seasonYear} />
          <label htmlFor="season-month">月份</label>
          <select id="season-month" name="month" defaultValue={period.month}>
            {monthOptions().map((month) => (
              <option value={month} key={month}>
                {month} 月
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            查看
          </button>
        </form>
        {!account ? (
          <Link className="ghost-button" href="/#account-login">
            登录后编辑
          </Link>
        ) : null}
      </section>
      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">
            {planData.season_year} / {String(planData.month).padStart(2, "0")}
          </span>
          <h2>{currentMonthTitle}</h2>
        </div>
        {canEdit ? <PlanEditor plans={planData.plans} period={period} /> : null}
        {hasPlans && !canEdit ? (
          <ul className="plan-task-list">
            {planData.plans.map((plan) => (
              <PlanCard key={plan.id ?? `${plan.robot_type}-${plan.task_title}`} plan={plan} />
            ))}
          </ul>
        ) : null}
        {!hasPlans && !canEdit ? (
          <div className="message error">当前没有可展示的{currentMonthTitle}。</div>
        ) : null}
      </section>
    </div>
  );
}
