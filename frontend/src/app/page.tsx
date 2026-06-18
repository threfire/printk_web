import Link from "next/link";

const featureCards = [
  {
    title: "发票管理",
    desc: "成员提交采购表格，管理员复核入库和出库报销。",
    href: "/invoices",
    status: "已接入",
  },
  {
    title: "赛季月度规划",
    desc: "按月份和组别拆解电控、机械、算法等任务。",
    href: "/season-plan",
    status: "建设中",
  },
  {
    title: "管理后台",
    desc: "维护发票、规划和后续团队展示内容。",
    href: "/admin",
    status: "需登录",
  },
];

const robots = ["英雄机器人", "步兵机器人", "工程机器人"];
const groups = ["电控组", "机械组", "算法组", "视觉组", "运营组"];

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="panel">
          <span className="eyebrow">PRINTK ROBOMASTER TEAM</span>
          <h1>把战队系统化。</h1>
          <p>
            这里是 PRINTK 战队统一门户。成员从这里进入发票管理、赛季规划、
            机器人展示和队员风采，管理人员在同一套后台维护团队数据。
          </p>
          <div className="hero-actions">
            <Link className="button" href="/invoices">
              进入发票管理
            </Link>
            <Link className="ghost-button" href="/season-plan">
              查看赛季规划
            </Link>
          </div>
        </div>
        <div className="panel hero-visual" aria-label="机器人视觉区域">
          <div className="robot-core" />
        </div>
      </section>

      <section className="section panel">
        <span className="eyebrow">功能中心</span>
        <h2>下级系统入口</h2>
        <div className="card-grid">
          {featureCards.map((card) => (
            <Link className="card" href={card.href} key={card.title}>
              <span className="badge">{card.status}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section panel">
        <span className="eyebrow">赛季资产</span>
        <h2>机器人展示</h2>
        <div className="card-grid">
          {robots.map((robot, index) => (
            <article className="card" key={robot}>
              <span className="badge">2026 赛季 #{index + 1}</span>
              <h3>{robot}</h3>
              <p>资料将按赛季归档，后续展示定位、负责组别、技术亮点和图片。</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section panel">
        <span className="eyebrow">团队结构</span>
        <h2>队员风采</h2>
        <div className="card-grid">
          {groups.map((group) => (
            <article className="card" key={group}>
              <h3>{group}</h3>
              <p>后续展示真实姓名、照片、职责和简介，并提供展示/隐藏开关。</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
