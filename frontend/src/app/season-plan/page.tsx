import Link from "next/link";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { API_BASE, SeasonPlanData, SeasonPlanItem } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";
import { SiteAccountProfile } from "@/lib/account-profile";
import { robotRoles } from "@/lib/robots";
import {
  formatSeasonPlanTitle,
  getCurrentSeasonPlanPeriod,
  SeasonPlanPeriod,
} from "@/lib/season-plan-period";

type SeasonPlanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const robotTypes = robotRoles.map((robot) => robot.name);
const planEditorPermissions = new Set(["兵种组长", "部门组长", "队长", "管理"]);
const weekNames = ["日", "一", "二", "三", "四", "五", "六"];

const emptyProfile: SiteAccountProfile = {
  account: "",
  full_name: "",
  gender: "",
  grade: "",
  member_status: "",
  permission_level: "",
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
  const seasonYearParam = firstParam(query.season_year);
  const monthParam = firstParam(query.month);
  const seasonYear = Number(seasonYearParam);
  const month = Number(monthParam);
  return {
    seasonYear: seasonYearParam && Number.isFinite(seasonYear) ? seasonYear : currentPeriod.seasonYear,
    month: monthParam && Number.isFinite(month) && month >= 1 && month <= 12 ? month : currentPeriod.month,
  };
}

function monthOptions() {
  return Array.from({ length: 12 }, (_, index) => index + 1);
}

function daysInMonth(period: SeasonPlanPeriod) {
  return new Date(period.seasonYear, period.month, 0).getDate();
}

function getMonthDays(period: SeasonPlanPeriod) {
  const count = daysInMonth(period);
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const date = new Date(period.seasonYear, period.month - 1, day);
    return {
      day,
      weekday: date.getDay(),
      weekIndex: Math.floor((day + new Date(period.seasonYear, period.month - 1, 1).getDay() - 1) / 7),
    };
  });
}

function nearbyPeriod(period: SeasonPlanPeriod, offset: number): SeasonPlanPeriod {
  const date = new Date(period.seasonYear, period.month - 1 + offset, 1);
  return { seasonYear: date.getFullYear(), month: date.getMonth() + 1 };
}

function periodHref(period: SeasonPlanPeriod, extra = "") {
  return `/season-plan?season_year=${period.seasonYear}&month=${period.month}${extra}`;
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

function planForDay(plans: SeasonPlanItem[], day: number) {
  if (plans.length === 0) {
    return null;
  }
  return plans[(day - 1) % plans.length];
}

function dayTone(plan: SeasonPlanItem | null, day: number) {
  if (plan?.is_completed) {
    return "done";
  }
  if (plan) {
    return day % 5 === 0 ? "risk" : "active";
  }
  return day % 6 === 0 ? "quiet" : "blank";
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
  const editablePlans = plans.length > 0 ? plans : robotTypes.slice(0, 4).map((_, index) => emptyPlan(index));
  const rows = [...editablePlans, ...Array.from({ length: 3 }, (_, index) => emptyPlan(index + editablePlans.length))];

  return (
    <details className="compact-editor">
      <summary>组长编辑月度任务</summary>
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
                <label htmlFor={`assignee_account_${index}`}>完成人</label>
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
                <textarea id={`target_${index}`} name={`target_${index}`} defaultValue={plan.target} rows={2} />
              </div>
            </article>
          ))}
        </div>
        <div className="form-actions">
          <button className="button" type="submit">
            保存月度任务
          </button>
        </div>
      </form>
    </details>
  );
}

function MonthBoard({ period, plans }: { period: SeasonPlanPeriod; plans: SeasonPlanItem[] }) {
  const monthDays = getMonthDays(period);
  const firstOffset = new Date(period.seasonYear, period.month - 1, 1).getDay();

  return (
    <section className="season-month-board" aria-label="月度规划表">
      <div className="month-week-row">
        {weekNames.map((name) => (
          <span key={name}>周{name}</span>
        ))}
      </div>
      <div className="month-grid" style={{ "--month-offset": firstOffset } as CSSProperties}>
        {monthDays.map(({ day, weekday, weekIndex }) => {
          const plan = planForDay(plans, day);
          const tone = dayTone(plan, day);
          return (
            <Link
              className={`month-cell month-cell-${tone}`}
              href={periodHref(period, `&view=week&week=${weekIndex}`)}
              key={day}
            >
              <span className="month-cell-day">{day}</span>
              <span className="month-cell-week">周{weekNames[weekday]}</span>
              <strong>{plan?.task_title || "机动维护"}</strong>
              <small>{plan?.robot_type || robotTypes[day % robotTypes.length]}</small>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function WeekZoom({
  period,
  week,
  plans,
}: {
  period: SeasonPlanPeriod;
  week: number;
  plans: SeasonPlanItem[];
}) {
  const days = getMonthDays(period).filter((item) => item.weekIndex === week);

  return (
    <section className="week-zoom" aria-label="周视图">
      <div className="week-days">
        {days.map(({ day, weekday }) => {
          const plan = planForDay(plans, day);
          return (
            <article className="week-day-card" key={day}>
              <div>
                <span>{period.month} 月 {day} 日</span>
                <strong>周{weekNames[weekday]}</strong>
              </div>
              <p>{plan?.task_title || "当天规划待补充"}</p>
            </article>
          );
        })}
      </div>
      <aside className="week-detail">
        <span className="eyebrow">DAY FOCUS</span>
        <h2>当天规划与进度点</h2>
        {days.map(({ day }) => {
          const plan = planForDay(plans, day);
          return (
            <div className="week-progress-row" key={day}>
              <span>{day}</span>
              <strong>{plan?.robot_type || "公共任务"}</strong>
              <p>{plan?.target || "补充当天目标、验收口径和风险备注。"}</p>
            </div>
          );
        })}
      </aside>
    </section>
  );
}

export default async function SeasonPlanPage({ searchParams }: SeasonPlanPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const query = await (searchParams ?? Promise.resolve(emptyQuery));
  const period = readPeriod(query);
  const currentMonthTitle = formatSeasonPlanTitle(period);
  const view = firstParam(query.view) === "week" ? "week" : "month";
  const week = Math.max(0, Number(firstParam(query.week)) || 0);
  const cookieStore = await cookies();
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const [planData, profile] = await Promise.all([fetchSeasonPlan(period), fetchProfile(account)]);
  const canEdit = Boolean(account) && planEditorPermissions.has(profile.permission_level) && !profile.is_disabled;
  const completedCount = planData.plans.filter((plan) => plan.is_completed).length;
  const totalCount = Math.max(planData.plans.length, 1);
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);
  const previous = nearbyPeriod(period, -1);
  const next = nearbyPeriod(period, 1);

  return (
    <div className="page season-planning-page">
      <section className="season-planning-hero">
        <div>
          <span className="eyebrow">SEASON MONTHLY PLAN</span>
          <h1>赛季月度规划</h1>
          <p>{currentMonthTitle}把每日任务、周进度和兵种入口放在同一屏，月表优先承载主要信息。</p>
        </div>
        <div className="season-hero-metrics" aria-label="月度状态">
          <div>
            <strong>{planData.plans.length}</strong>
            <span>任务</span>
          </div>
          <div>
            <strong>{completedCount}/{totalCount}</strong>
            <span>完成</span>
          </div>
          <div>
            <strong>{robotRoles.length}</strong>
            <span>兵种</span>
          </div>
        </div>
      </section>

      <section className="season-control-strip" aria-label="月份与视图控制">
        <Link className="ghost-button" href={periodHref(previous)}>
          上月
        </Link>
        <form className="inline-login season-month-form" action="/season-plan" method="get">
          <input name="season_year" type="number" min={2020} max={2100} defaultValue={period.seasonYear} aria-label="赛季年份" />
          <select name="month" defaultValue={period.month} aria-label="月份">
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
        <Link className="ghost-button" href={periodHref(next)}>
          下月
        </Link>
        <Link className="ghost-button" href={periodHref(period)}>
          月
        </Link>
        <Link className="ghost-button" href={periodHref(period, `&view=week&week=${week}`)}>
          周
        </Link>
      </section>

      {ok ? <div className="message">{ok}</div> : null}
      {error ? <div className="message error">{error}</div> : null}

      <MonthBoard period={period} plans={planData.plans} />
      {view === "week" ? <WeekZoom period={period} week={week} plans={planData.plans} /> : null}
      {canEdit ? <PlanEditor plans={planData.plans} period={period} /> : null}

      <section className="robot-rail-section" aria-label="兵种机器人入口">
        <div className="robot-rail-heading">
          <span className="eyebrow">ROBOT LINES</span>
          <h2>开发中的兵种机器人</h2>
        </div>
        <div className="robot-rail">
          {robotRoles.map((robot) => (
            <Link className="robot-rail-card" href={`/robots/${robot.id}`} key={robot.id}>
              <span>{robot.shortName}</span>
              <strong>{robot.role}</strong>
              <small>{robot.group}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
