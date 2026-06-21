import Image from "next/image";
import Link from "next/link";
import { HomeCarousel } from "@/components/HomeCarousel";
import { API_BASE, type HomepageContentData } from "@/lib/api";

const robots = ["英雄兵种", "步兵兵种", "工程兵种", "哨兵兵种", "无人机兵种", "雷达兵种", "飞镖兵种"];
const groups = ["电控组", "机械组", "算法组", "视觉组", "运营组"];

const carouselImages = [
  { src: "/home-carousel/team-01.jpeg", alt: "PRINTK 成员在实验室演示康复机器人设备" },
  { src: "/home-carousel/team-02.jpeg", alt: "PRINTK 队员在赛事实地交流" },
  { src: "/home-carousel/team-03.jpeg", alt: "PRINTK 队员在场馆内讨论比赛细节" },
  { src: "/home-carousel/team-04.jpeg", alt: "PRINTK 成员在赛场调试机器人" },
  { src: "/home-carousel/team-05.jpeg", alt: "PRINTK 队员在比赛现场观察机器人状态" },
  { src: "/home-carousel/team-06.jpeg", alt: "PRINTK 队员在场边关注比赛进程" },
  { src: "/home-carousel/team-07.jpeg", alt: "PRINTK 成员在场馆通道集合" },
  { src: "/home-carousel/team-08.png", alt: "PRINTK 战队赛季全员合影" },
  { src: "/home-carousel/team-09.jpg", alt: "PRINTK 战队在 RoboMaster 现场合影" },
  { src: "/home-carousel/team-10.jpg", alt: "PRINTK 成员围绕机器人开展线下交流" },
  { src: "/home-carousel/team-11.jpg", alt: "PRINTK 队员围绕电脑集中讨论调试方案" },
  { src: "/home-carousel/team-12.jpeg", alt: "PRINTK 战队与机器人在赛场内合影留念" },
  { src: "/home-carousel/team-13.jpeg", alt: "PRINTK 队员在比赛现场近距离调试机器人" },
];

const carouselQuotes = [
  { text: "道路且长，行则将至。", source: "PRINTK 赛季口号" },
  { text: "为青春赋予荣光，让思考拥有力量。", source: "RoboMaster 赛事理念" },
  { text: "服务全球青年工程师成为追求极致、有实干精神的梦想家", source: "RoboMaster 高校系列赛" },
  { text: "崇尚科学与创新，擅于反思，勇于实践，热爱分享。", source: "RoboMaster 赛事理念" },
  { text: "初心高于胜负，每一份努力都值得被肯定。", source: "RoboMaster 组织奖文案" },
  { text: "以学术价值为根基，培养具备工程思维、拥有实干精神的综合素质人才", source: "RoboMaster 赛事愿景" },
  { text: "勇于创新、追求极致、崇尚实干、具备视野和远见", source: "RoboMaster 专属招聘通道" },
];

const fallbackHomepage: HomepageContentData = {
  video: {
    id: "fallback-video",
    kind: "video",
    url: "/season-promo.mp4",
    original_filename: "欢送老登之夜.mp4",
    mime_type: "video/mp4",
    size_bytes: 6233758,
    alt: "赛季宣传视频",
    display_order: 1,
    is_enabled: true,
    created_at: "",
    updated_at: "",
  },
  videos: [],
  images: carouselImages.map((image, index) => ({
    id: `fallback-image-${index + 1}`,
    kind: "image",
    url: image.src,
    original_filename: image.src.split("/").pop() ?? "",
    mime_type: "",
    size_bytes: 0,
    alt: image.alt,
    display_order: index + 1,
    is_enabled: true,
    created_at: "",
    updated_at: "",
  })),
  quotes: carouselQuotes.map((quote, index) => ({
    id: `fallback-quote-${index + 1}`,
    text: quote.text,
    source: quote.source,
    display_order: index + 1,
    is_enabled: true,
    created_at: "",
    updated_at: "",
  })),
};

async function fetchHomepageContent() {
  try {
    const response = await fetch(`${API_BASE}/api/homepage`, { cache: "no-store" });
    if (!response.ok) {
      return fallbackHomepage;
    }
    return (await response.json()) as HomepageContentData;
  } catch {
    return fallbackHomepage;
  }
}

export default async function Home() {
  const homepage = await fetchHomepageContent();
  const video = homepage.video ?? fallbackHomepage.video;
  const carouselImageItems = (homepage.images.length ? homepage.images : fallbackHomepage.images).map((image) => ({
    src: image.url,
    alt: image.alt || image.original_filename || "战队图片展示",
  }));
  const quoteItems = (homepage.quotes.length ? homepage.quotes : fallbackHomepage.quotes).map((quote) => ({
    text: quote.text,
    source: quote.source,
  }));

  return (
    <div className="page">
      {video ? (
        <section className="season-video" aria-label={video.alt || "赛季宣传视频"}>
          <video className="season-video-player" controls playsInline preload="metadata">
            <source src={video.url} type={video.mime_type || "video/mp4"} />
          </video>
        </section>
      ) : null}

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">PRINTK ROBOMASTER TEAM</span>
          <h1>战队门户与赛季资产中心</h1>
          <p>
            PRINTK 门户把功能入口、赛季规划、兵种展示和队员资料放在同一个入口，成员能快速进入业务系统，管理人员能持续维护战队数据。
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
        <div className="hero-visual" aria-label="战队徽展示区">
          <div className="emblem-stage">
            <Image className="emblem-image" src="/team-logo.jpg" alt="PRINTK 战队徽" width={360} height={360} priority />
            <div className="emblem-ring" />
          </div>
          <div className="hero-stats" aria-label="战队概览">
            <div>
              <strong>5</strong>
              <span>核心组别</span>
            </div>
            <div>
              <strong>7</strong>
              <span>兵种方向</span>
            </div>
            <div>
              <strong>2026</strong>
              <span>赛季规划</span>
            </div>
          </div>
        </div>
      </section>

      <HomeCarousel images={carouselImageItems} quotes={quoteItems} />

      <section className="section split-section">
        <div className="section-heading">
          <span className="eyebrow">赛季资产</span>
          <h2>兵种展示</h2>
        </div>
        <div className="card-grid">
          {robots.map((robot, index) => (
            <article className="card" key={robot}>
              <span className="badge">2026 赛季 #{index + 1}</span>
              <h3>{robot}</h3>
              <p>资料按赛季归档，展示兵种定位、负责组别、当前重点和交付物。</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section">
        <div className="section-heading">
          <span className="eyebrow">团队结构</span>
          <h2>队员</h2>
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

      <footer className="home-thanks">
        <p>致谢：感谢队员、指导老师、测试同学和开源社区的支持。</p>
      </footer>

      <a className="home-contact-fab" href="#home-contact" aria-label="联系我们" title="联系我们">
        联系我们
      </a>
      <div className="home-contact-popover" id="home-contact" role="dialog" aria-modal="true" aria-labelledby="home-contact-title">
        <a className="home-contact-dismiss" href="#" aria-label="关闭联系我们弹窗" />
        <div className="home-contact-dialog">
          <div className="account-modal-heading">
            <h2 id="home-contact-title">联系我们</h2>
            <a className="account-modal-close" href="#" aria-label="关闭联系我们弹窗">
              ×
            </a>
          </div>
          <p>有任何问题请联系微信号</p>
          <strong className="home-contact-wechat">hy15186081202</strong>
        </div>
      </div>
    </div>
  );
}
