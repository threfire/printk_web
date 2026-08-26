import Link from "next/link";

const competitionStages = [
  ["01", "前期报名", "完成队伍组建与参赛信息登记。"],
  ["02", "中期培训", "学习机械、电控、程序与裁判系统基础规范。"],
  ["03", "机器人制作", "按照赛事规范完成微缩版步兵机器人的设计、制作与调试。"],
  ["04", "完整形态考核", "机器人通过完整形态考核后获得最终比赛资格。"],
];

const resources = [
  ["RULES", "对抗赛规则介绍视频", "规则讲解视频待发布"],
  ["DOCS", "对抗赛技术资料", "技术规范与培训资料待发布"],
  ["MODEL", "开源模型", "机器人结构模型待发布"],
  ["CODE", "开源代码", "基础控制与裁判系统代码待发布"],
];

const registeredTeams: { name: string; logo: string }[] = [];

export default function CampusVersusPage() {
  return (
    <div className="page campus-event-page">
      <section className="campus-event-hero" aria-labelledby="versus-title">
        <div>
          <span className="eyebrow">2027 CAMPUS COMPETITION / VERSUS</span>
          <h1 id="versus-title">对抗赛</h1>
          <p>自主制作微缩版步兵机器人，搭载小型裁判系统装甲板，在缩小版 1v1 场地中完成机器人对抗。</p>
          <div className="campus-event-actions">
            <a className="button campus-primary-action" href="#registration">立即报名</a>
            <Link className="ghost-button" href="/campus-competition">返回赛项选择</Link>
          </div>
        </div>
        <div className="campus-event-mark" aria-hidden="true">
          <span>02</span>
          <strong>1V1</strong>
          <small>BUILD &amp; FIGHT</small>
        </div>
      </section>

      <section className="campus-event-section campus-event-overview" aria-labelledby="versus-overview-title">
        <div className="campus-section-number">01</div>
        <div>
          <span className="eyebrow">EVENT OVERVIEW</span>
          <h2 id="versus-overview-title">从设计制造走向赛场</h2>
          <p>参赛队按照赛事规范制作微缩版步兵机器人，并搭载由赛事方提供的小型裁判系统装甲板。机器人将在缩小版 1v1 场地中进行移动、攻击和战术对抗，完整检验结构设计、电控开发、程序调试与团队协作能力。</p>
        </div>
      </section>

      <section className="campus-event-section" aria-labelledby="versus-schedule-title">
        <div className="campus-section-number">02</div>
        <div className="campus-section-content">
          <span className="eyebrow">COMPETITION ROADMAP</span>
          <h2 id="versus-schedule-title">赛程安排</h2>
          <div className="campus-stage-grid">
            {competitionStages.map(([index, title, description]) => (
              <article key={index}>
                <small>{index}</small>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="campus-event-section campus-format-section" aria-labelledby="versus-format-title">
        <div className="campus-section-number">03</div>
        <div>
          <span className="eyebrow">MATCH FORMAT &amp; REWARDS</span>
          <h2 id="versus-format-title">瑞士轮与淘汰赛</h2>
          <p>通过完整形态考核的队伍进入正式比赛。比赛由瑞士轮和淘汰赛组成，参赛队依据最终排名占比获得对应奖励。</p>
        </div>
      </section>

      <section className="campus-resource-section" aria-labelledby="versus-resource-title">
        <header>
          <span className="eyebrow">TECHNICAL RESOURCES</span>
          <h2 id="versus-resource-title">规则与技术资料</h2>
        </header>
        <div className="campus-resource-grid">
          {resources.map(([code, title, status]) => (
            <article key={code}>
              <small>{code}</small>
              <h3>{title}</h3>
              <p>{status}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="campus-team-section" aria-labelledby="registered-team-title">
        <header>
          <span className="eyebrow">REGISTERED TEAMS</span>
          <h2 id="registered-team-title">已报名队伍</h2>
        </header>
        {registeredTeams.length ? (
          <div className="campus-team-grid">
            {registeredTeams.map((team) => (
              <article key={team.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={team.logo} alt={`${team.name}队徽`} />
                <strong>{team.name}</strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="campus-team-empty">
            <span aria-hidden="true">TEAM</span>
            <p>报名成功的队伍队名与队徽将在这里展示。</p>
          </div>
        )}
      </section>

      <section className="campus-registration-panel" id="registration" aria-labelledby="versus-registration-title">
        <div>
          <span className="eyebrow">REGISTRATION</span>
          <h2 id="versus-registration-title">组队参加对抗赛</h2>
          <p>完成报名后进入培训与制作阶段，赛事负责人将同步规范、考核要求和赛程通知。</p>
        </div>
        <Link className="button campus-primary-action" href="/#home-contact">联系负责人报名</Link>
      </section>
    </div>
  );
}
