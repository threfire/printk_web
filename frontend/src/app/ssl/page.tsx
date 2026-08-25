import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { API_BASE, type SSLInterviewApplication } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type SSLPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels = {
  pending: "待审核",
  approved: "已通过",
  rejected: "未通过",
} as const;

async function getApplication(account: string) {
  if (!account) return null;
  try {
    const response = await fetch(`${API_BASE}/api/ssl/applications/${encodeURIComponent(account)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { application: SSLInterviewApplication | null };
    return data.application;
  } catch {
    return null;
  }
}

function formatDateTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function SSLPage({ searchParams }: SSLPageProps) {
  const emptyParams: Record<string, string | string[] | undefined> = {};
  const [cookieStore, params] = await Promise.all([cookies(), searchParams ?? Promise.resolve(emptyParams)]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const application = await getApplication(account);
  const ok = firstParam(params.ok);
  const error = firstParam(params.error);
  const canApply = !application || application.status === "rejected";

  return (
    <div className="page ssl-page">
      <section className="ssl-intro" aria-labelledby="ssl-title">
        <div className="ssl-intro-copy">
          <span className="eyebrow">ROBOCUP SMALL SIZE LEAGUE</span>
          <h1 id="ssl-title">SSL 部</h1>
          <p>
            RoboCup 小型组足球赛以全自主轮式机器人为参赛主体，机器人通过视觉、无线通信、路径规划与实时控制完成协同对抗。
          </p>
          <p>
            SSL 部围绕机械结构、电控硬件、嵌入式控制、视觉感知、决策算法和赛事运营开展研发，成员将在真实赛场节奏中完成系统联调与迭代。
          </p>
          <div className="ssl-tags" aria-label="SSL 部研发方向">
            <span>全自主机器人</span>
            <span>多机协同</span>
            <span>实时决策</span>
            <span>机器人足球</span>
          </div>
        </div>
        <figure className="ssl-visual">
          <Image
            src="/robocupssl.jpg"
            alt="RoboCup 小型组足球机器人在场地中围绕橙色球比赛"
            width={720}
            height={872}
            priority
          />
        </figure>
      </section>

      <section className="section ssl-application" aria-labelledby="ssl-application-title">
        <div className="section-heading">
          <span className="eyebrow">INTERVIEW</span>
          <h2 id="ssl-application-title">面试申请</h2>
          <p>填写个人经历与意向方向，选择可参加面试的时间。</p>
        </div>
        {ok ? <div className="message" role="status">{ok}</div> : null}
        {error ? <div className="message error" role="alert">{error}</div> : null}

        {account ? (
          <div className="ssl-application-grid">
            {application ? (
              <article className={`ssl-status-card ${application.status}`}>
                <div className="ssl-status-head">
                  <span className={`ssl-status-badge ${application.status}`}>{statusLabels[application.status]}</span>
                  <strong>{application.interview_direction}方向</strong>
                </div>
                <dl>
                  <div><dt>申请人</dt><dd>{application.full_name || application.applicant_account}</dd></div>
                  <div><dt>年级</dt><dd>{application.grade || "待完善"}</dd></div>
                  <div><dt>面试时间</dt><dd>{formatDateTime(application.interview_time)}</dd></div>
                  {application.interview_location ? <div><dt>面试地点</dt><dd>{application.interview_location}</dd></div> : null}
                  {application.rejection_reason ? <div><dt>未通过原因</dt><dd>{application.rejection_reason}</dd></div> : null}
                </dl>
                <Link className="ghost-button" href="/account/messages">查看站内消息</Link>
              </article>
            ) : null}

            {canApply ? (
              <form className="form ssl-form" action="/api/ssl/applications" method="post">
                <div className="field">
                  <label htmlFor="ssl-self-intro">自我简介</label>
                  <textarea id="ssl-self-intro" name="self_intro" rows={7} maxLength={1000} required placeholder="介绍你的专业基础、项目经历、擅长技能与加入 SSL 部的目标" />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="ssl-direction">面试方向</label>
                    <select id="ssl-direction" name="interview_direction" defaultValue="" required>
                      <option value="" disabled>请选择方向</option>
                      {['机械', '电控', '硬件', '算法', '视觉', '运营'].map((direction) => <option key={direction} value={direction}>{direction}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ssl-time">面试时间</label>
                    <input id="ssl-time" name="interview_time" type="datetime-local" required />
                  </div>
                </div>
                <button className="button" type="submit">提交面试申请</button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="ssl-login-required">
            <p>面试申请仅对已注册并登录的 PRINTK 战队账号开放。</p>
            <div className="form-actions">
              <Link className="button" href="/#account-login">登录账号</Link>
              <Link className="ghost-button" href="/#account-register">注册账号</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
