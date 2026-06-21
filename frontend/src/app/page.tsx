import Image from "next/image";
import Link from "next/link";
import { HomeCarousel } from "@/components/HomeCarousel";

const featureCards = [
  {
    title: "发票管理",
    desc: "成员提交采购表格，管理员完成复核、入库和报销出库。",
    href: "/invoices",
    status: "已接入",
  },
  {
    title: "赛季规划",
    desc: "按月份和组别拆解电控、机械、算法、视觉和运营任务。",
    href: "/season-plan",
    status: "可编辑",
  },
  {
    title: "管理后台",
    desc: "维护发票批次、库存明细、报销批次和处理日志。",
    href: "/admin",
    status: "需登录",
  },
];

const robots = ["英雄机器人", "步兵机器人", "工程机器人"];
const groups = ["电控组", "机械组", "算法组", "视觉组", "运营组"];

const carouselImages = [
  {
    src: "/home-carousel/team-01.jpeg",
    alt: "PRINTK 成员在实验室演示康复机器人设备",
  },
  {
    src: "/home-carousel/team-02.jpeg",
    alt: "PRINTK 队员在赛事现场交流",
  },
  {
    src: "/home-carousel/team-03.jpeg",
    alt: "PRINTK 队员在场馆内讨论比赛细节",
  },
  {
    src: "/home-carousel/team-04.jpeg",
    alt: "PRINTK 成员在赛场调试机器人",
  },
  {
    src: "/home-carousel/team-05.jpeg",
    alt: "PRINTK 队员在比赛现场观察机器人状态",
  },
  {
    src: "/home-carousel/team-06.jpeg",
    alt: "PRINTK 队员在场边关注比赛进程",
  },
  {
    src: "/home-carousel/team-07.jpeg",
    alt: "PRINTK 成员在场馆通道集合",
  },
  {
    src: "/home-carousel/team-08.png",
    alt: "PRINTK 战队赛季全员合影",
  },
];

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">PRINTK ROBOMASTER TEAM</span>
          <h1>战队门户与赛季资产中心</h1>
          <p>
            PRINTK 门户把发票管理、赛季规划、机器人展示和队员风采放在同一入口，成员能快速进入业务系统，管理人员能持续维护战队数据。
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
        <div className="hero-visual" aria-label="战队队徽展示区">
          <div className="emblem-stage">
            <Image
              className="emblem-image"
              src="/team-logo.jpg"
              alt="PRINTK 战队队徽"
              width={360}
              height={360}
              priority
            />
            <div className="emblem-ring" />
          </div>
          <div className="hero-stats" aria-label="战队概览">
            <div>
              <strong>5</strong>
              <span>核心组别</span>
            </div>
            <div>
              <strong>3</strong>
              <span>机器人方向</span>
            </div>
            <div>
              <strong>2026</strong>
              <span>赛季规划</span>
            </div>
          </div>
        </div>
      </section>

      <HomeCarousel images={carouselImages} />

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">功能中心</span>
          <h2>子系统入口</h2>
        </div>
        <div className="card-grid">
          {featureCards.map((card) => (
            <Link className="card feature-card" href={card.href} key={card.title}>
              <span className="badge">{card.status}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section split-section">
        <div className="section-heading">
          <span className="eyebrow">赛季资产</span>
          <h2>机器人展示</h2>
        </div>
        <div className="card-grid">
          {robots.map((robot, index) => (
            <article className="card" key={robot}>
              <span className="badge">2026 赛季 #{index + 1}</span>
              <h3>{robot}</h3>
              <p>资料按赛季归档，展示定位、负责组别、当前重点和交付物。</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section">
        <div className="section-heading">
          <span className="eyebrow">团队结构</span>
          <h2>队员风采</h2>
        </div>
        <div className="card-grid">
          {groups.map((group) => (
            <article className="card" key={group}>
              <h3>{group}</h3>
              <p>展示组别职责、负责重点和可沉淀资料，方便成员快速找到协作入口。</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
