import Image from "next/image";
import Link from "next/link";

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
    status: "建设中",
  },
  {
    title: "管理后台",
    desc: "维护发票批次、库存明细和后续团队展示内容。",
    href: "/admin",
    status: "需登录",
  },
];

const robots = ["英雄机器人", "步兵机器人", "工程机器人"];
const groups = ["电控组", "机械组", "算法组", "视觉组", "运营组"];

const carouselImages = [
  {
    src: "/home-carousel/slide-1.jpg",
    alt: "PRINTK 赛季研发中心宽幅图",
  },
  {
    src: "/home-carousel/slide-2.jpg",
    alt: "PRINTK 战队资产看板宽幅图",
  },
  {
    src: "/home-carousel/slide-3.jpg",
    alt: "PRINTK 训练与复盘现场宽幅图",
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

      <section className="image-carousel" aria-label="战队图片展示">
        {carouselImages.map((image) => (
          <Image
            className="carousel-image"
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 1180px) calc(100vw - 2rem), 1180px"
            key={image.src}
          />
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">功能中心</span>
          <h2>下级系统入口</h2>
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
              <p>资料将按赛季归档，展示定位、负责组别、技术亮点和图片。</p>
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
              <p>后续展示真实姓名、照片、职责和简介，并提供展示状态管理。</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
