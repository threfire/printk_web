import { cookies } from "next/headers";
import { API_BASE, SeasonPlanData, SeasonPlanItem } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";
import {
  formatSeasonPlanTitle,
  getCurrentSeasonPlanPeriod,
  SeasonPlanPeriod,
} from "@/lib/season-plan-period";

type SeasonPlanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

function PlanCard({ plan }: { plan: SeasonPlanItem }) {
  return (
    <article className="card plan-card">
      <span className="badge">{plan.status}</span>
      <h3>{plan.group_name}</h3>
      <p>{plan.target}</p>
    </article>
  );
}

function PlanEditor({ plans, period }: { plans: SeasonPlanItem[]; period: SeasonPlanPeriod }) {
  return (
    <form className="form" action="/api/season-plan/update" method="post">
      <input name="season_year" type="hidden" value={period.seasonYear} />
      <input name="month" type="hidden" value={period.month} />
      <input name="count" type="hidden" value={plans.length} />
      <div className="card-grid">
        {plans.map((plan, index) => (
          <article className="card plan-card plan-editor-card" key={plan.id ?? plan.group_name}>
            <div className="field">
              <label htmlFor={`group_name_${index}`}>组别</label>
              <input
                id={`group_name_${index}`}
                name={`group_name_${index}`}
                defaultValue={plan.group_name}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`status_${index}`}>状态</label>
              <input id={`status_${index}`} name={`status_${index}`} defaultValue={plan.status} required />
            </div>
            <div className="field">
              <label htmlFor={`target_${index}`}>计划目标</label>
              <textarea id={`target_${index}`} name={`target_${index}`} defaultValue={plan.target} rows={5} required />
            </div>
          </article>
        ))}
      </div>
      <div className="form-actions">
        <button className="button" type="submit">
          保存计划
        </button>
        <button className="ghost-button" formAction="/api/season-plan/logout" formMethod="post" type="submit">
          退出编辑
        </button>
      </div>
    </form>
  );
}

export default async function SeasonPlanPage({ searchParams }: SeasonPlanPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const currentPeriod = getCurrentSeasonPlanPeriod();
  const currentMonthTitle = formatSeasonPlanTitle(currentPeriod);
  const [planData, cookieStore, query] = await Promise.all([
    fetchSeasonPlan(currentPeriod),
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const editorToken = cookieStore.get("printk-plan-token")?.value ?? "";
  const isEditing = Boolean(editorToken);
  const hasPlans = planData.plans.length > 0;
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">SEASON PLAN</span>
        <h1>赛季月度规划</h1>
        <p>{currentMonthTitle}由接口读取，组长登录后可维护组别状态和目标。</p>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        {!isEditing && (
          <form className="inline-login" action="/api/season-plan/login" method="post">
            <label className="sr-only" htmlFor="leader-password">
              组长密码
            </label>
            <input id="leader-password" name="password" type="password" placeholder="组长密码" required />
            <button className="button" type="submit">
              进入编辑
            </button>
          </form>
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">
            {planData.season_year} / {String(planData.month).padStart(2, "0")}
          </span>
          <h2>{currentMonthTitle}</h2>
        </div>
        {hasPlans && isEditing && <PlanEditor plans={planData.plans} period={currentPeriod} />}
        {hasPlans && !isEditing && (
          <div className="card-grid">
            {planData.plans.map((plan) => (
              <PlanCard key={plan.id ?? plan.group_name} plan={plan} />
            ))}
          </div>
        )}
        {!hasPlans && (
          <div className="message error">
            当前没有可展示的{currentMonthTitle}。请确认后端服务已启动，或由组长登录后保存本月计划。
          </div>
        )}
      </section>
    </div>
  );
}
