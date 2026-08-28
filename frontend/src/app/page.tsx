import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { HomeAwardsCarousel, type HomeAwardItem } from "@/components/HomeAwardsCarousel";
import { HomeCarousel, HomeQuoteCarousel } from "@/components/HomeCarousel";
import { TeamEmblemPlayer } from "@/components/TeamEmblemPlayer";
import { HomeEventAccordion } from "@/components/HomeEventAccordion";
import { HomeGroupAccordion } from "@/components/HomeGroupAccordion";
import { API_BASE, type HomepageContentData } from "@/lib/api";
import { ENABLE_FORUM, ENABLE_INTERACTIVE } from "@/lib/site-mode";

const awardPlaceholders = [
  { title: "RoboMaster 赛事奖项", meta: "奖状图片占位" },
  { title: "赛季工程成果", meta: "奖杯图片占位" },
  { title: "校级竞赛荣誉", meta: "证书图片占位" },
  { title: "技术创新成果", meta: "奖项图片占位" },
  { title: "团队建设荣誉", meta: "合影图片占位" },
  { title: "年度贡献奖项", meta: "荣誉图片占位" },
];

const fallbackRecruitmentGroups = [
  { name: "机械组", summary: "负责结构设计、加工装配与整机维护。" },
  { name: "电控组", summary: "负责电气系统、嵌入式控制与整车联调。" },
  { name: "硬件组", summary: "负责电路板、传感器和硬件链路验证。" },
  { name: "算法组", summary: "负责视觉识别、运动控制与数据复盘。" },
  { name: "运营组", summary: "负责赛事运营、宣传内容与团队协作。" },
];

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
  profile: {
    team_name: "PRINTK 机甲大师战队",
    team_intro: "PRINTK 机甲大师战队成立于 2024 年秋季，基地位于贵州大学明正楼科技园 1 楼报告厅，现有正式队员 30 余人。战队曾获 2025 赛季高校联盟赛广西站步兵对抗赛季军，并在 2026 赛季高校联盟赛重庆站首次完整出征步兵对抗赛、工程挑战赛与 3v3 对抗赛三个赛项。",
    stats: [
      { value: "4", label: "核心组别" },
      { value: "7", label: "兵种方向" },
      { value: "2026", label: "赛季规划" },
    ],
    awards: awardPlaceholders.map((award, index) => ({
      ...award,
      image_url: "",
      image_alt: "",
      display_order: index + 1,
    })),
    recruitment: {
      season_label: "2028 赛季招新",
      title: "加入 PRINTK，\n把热爱做成能上场的机器人",
      intro: "从赛事认知到分组实践，找到适合自己的方向，和队友一起把想法做成真正能上场的机器人。",
      event_kicker: "01 / ABOUT THE EVENT",
      event_title: "RoboMaster 机甲大师赛事介绍",
      event_description: "RoboMaster 机甲大师赛是国内顶尖大学生工科竞技赛事，被誉为青年工程师的培育摇篮。赛事主要分为机甲对抗赛、人工智能挑战赛、单项技能赛等多个赛道，综合考验机械结构设计、电控编程、机器视觉算法与团队运营能力。",
      events: [
        { id: "robomaster", name: "RoboMaster", kicker: "01 / 机甲大师", title: "RoboMaster 赛事介绍", description: "RoboMaster 机甲大师赛聚焦大学生机器人对抗，综合考验机械结构、电控编程、机器视觉与团队协作能力。" },
        { id: "robocon", name: "Robocon", kicker: "02 / 亚太大学生机器人大赛", title: "Robocon 赛事介绍", description: "Robocon 鼓励大学生围绕年度主题自主设计和制作机器人，在限定场地完成任务挑战，强调创意、工程实现与现场协作。" },
        { id: "robocup", name: "RoboCup", kicker: "03 / 世界机器人足球赛", title: "RoboCup 赛事介绍", description: "RoboCup 以全自主机器人足球为核心，训练感知、定位、路径规划和多机协同，让算法决策在真实赛场中持续进化。" },
      ],
      groups_kicker: "02 / JOIN PRINTK",
      groups_title: "PRINTK 五大组别",
      groups: fallbackRecruitmentGroups,
      qr_text: "扫码进群即可报名咨询",
    },
    updated_at: "",
  },
  recruitment_banner: {
    text: "2027赛季招新中",
    action_text: "点击跳转",
    is_enabled: true,
    updated_at: "",
  },
  campus_banner: {
    text: "2027贵州大学机甲大师校内赛",
    action_text: "由此报名",
    is_enabled: true,
    updated_at: "",
  },
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

function buildAwardItems(homepage: HomepageContentData): HomeAwardItem[] {
  if (!homepage.profile.awards.length) {
    return awardPlaceholders;
  }

  return homepage.profile.awards.map((award) => ({
    title: award.title,
    meta: award.meta,
    image: award.image_url ? { src: award.image_url, alt: award.image_alt || award.title } : undefined,
  }));
}

export default async function Home() {
  const cookieStore = await cookies();
  const accountName = cookieStore.get("printk-site-account")?.value ?? "";
  const homepage = await fetchHomepageContent();
  const video = homepage.video ?? fallbackHomepage.video;
  const carouselImageItems = (homepage.images.length ? homepage.images : fallbackHomepage.images).map((image) => ({
    imageKey: image.id,
    src: image.url,
    alt: image.alt || image.original_filename || "战队图片展示",
  }));
  const quoteItems = (homepage.quotes.length ? homepage.quotes : fallbackHomepage.quotes).map((quote) => ({
    text: quote.text,
    source: quote.source,
  }));
  const mottoItems = quoteItems.length ? quoteItems : carouselQuotes;
  const awardItems = buildAwardItems(homepage);
  const recruitment = homepage.profile.recruitment ?? fallbackHomepage.profile.recruitment;
  const teamNameParts = homepage.profile.team_name.trim().split(/\s+/);
  const teamBrand = teamNameParts[0] || homepage.profile.team_name;
  const rawTeamDescriptor = teamNameParts.slice(1).join(" ");
  const teamLabel = rawTeamDescriptor.endsWith("战队") ? "战队" : "";
  const teamDescriptor = teamLabel ? rawTeamDescriptor.slice(0, -teamLabel.length).trim() : rawTeamDescriptor;

  return (
    <div className="page" id="top">
      <div className="home-intro-backdrop">
        {homepage.recruitment_banner ? (
          <a className="home-recruitment-banner" href="#home-recruitment">
            <span>{homepage.recruitment_banner.text}</span>
            <strong>{homepage.recruitment_banner.action_text}<i aria-hidden="true">→</i></strong>
          </a>
        ) : null}
        {homepage.campus_banner ? (
          <Link className="home-recruitment-banner home-campus-competition-banner" href="/campus-competition">
            <span>{homepage.campus_banner.text}</span>
            <strong>{homepage.campus_banner.action_text}<i aria-hidden="true">→</i></strong>
          </Link>
        ) : null}
        {video ? (
          <section className="season-video" aria-label={video.alt || "赛季宣传视频"}>
            <video className="season-video-player" controls playsInline preload="metadata">
              <source src={video.url} type={video.mime_type || "video/mp4"} />
            </video>
          </section>
        ) : null}

        <section className="hero">
          <div className="hero-copy">
            <h1 className="hero-title">
              <span className="hero-title-line">
                <span className="hero-title-primary">{teamBrand}</span>
                {teamLabel ? <span className="hero-title-secondary">{teamLabel}</span> : null}
              </span>
              {teamDescriptor ? <span className="hero-title-secondary">{teamDescriptor}</span> : null}
            </h1>
            <p>{homepage.profile.team_intro}</p>
            {ENABLE_INTERACTIVE ? <div className="hero-actions">
              <Link className="button" href="/invoices">
                进入报销管理
              </Link>
              <Link className="ghost-button" href="/season-plan">
                查看赛季规划
              </Link>
            </div> : null}
            <div className="hero-stats" aria-label="战队概览">
              {homepage.profile.stats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual" aria-label="战队徽展示区">
            <div className="emblem-stage">
              <TeamEmblemPlayer />
            </div>
          </div>
        </section>
      </div>

      <HomeCarousel images={carouselImageItems} accountName={accountName} enableInteractive />

      <section className="home-awards" aria-labelledby="home-awards-title">
        <div className="home-awards-heading">
          <h2 id="home-awards-title">奖项与荣誉展示</h2>
        </div>
        <HomeAwardsCarousel awards={awardItems} />
      </section>

      <section className="home-motto" aria-label="团队口号">
        <HomeQuoteCarousel quotes={mottoItems} />
      </section>

      <section className="home-recruitment" id="home-recruitment" aria-labelledby="home-recruitment-title">
        <div className="home-recruitment-heading">
          <span className="eyebrow">{recruitment.season_label}</span>
          <h2 id="home-recruitment-title">{recruitment.title}</h2>
          <p>{recruitment.intro}</p>
        </div>
        <div className="home-recruitment-blocks">
          <article className="home-recruitment-block home-recruitment-events">
            <HomeEventAccordion events={recruitment.events} />
          </article>
          <article className="home-recruitment-block">
            <h3>{recruitment.groups_title}</h3>
            <HomeGroupAccordion groups={recruitment.groups} />
          </article>
        </div>
        <div className="home-recruitment-qr">
          <Image src="/recruitment-qr.png" alt="PRINTK 2028 赛季招新群二维码" width={820} height={820} />
          <p>{recruitment.qr_text}</p>
        </div>
      </section>

      <footer className="home-thanks" aria-labelledby="home-footer-title">
        <div className="home-footer-main">
          <div className="home-footer-brand">
            <span className="eyebrow">PRINTK ROBOMASTER TEAM</span>
            <h2 id="home-footer-title">贵州大学 PRINTK 机器人战队</h2>
            <p>面向 RoboMaster 赛季训练、工程沉淀和团队协作的统一门户。</p>
          </div>
          <nav className="home-footer-nav" aria-label="首页底部导航">
            <Link href="/season-plan">赛季规划</Link>
            <Link href="/robots">兵种展示</Link>
            <Link href="/members">队员资料</Link>
            {ENABLE_FORUM ? <Link href="/forum">论坛交流</Link> : null}
          </nav>
          <div className="home-footer-contact">
            <span>联系我们</span>
            <strong>微信 hy15186081202</strong>
            <a href="#home-contact">打开联系窗口</a>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>致谢：感谢指导老师、历届队员、测试同学与开源社区的支持。</p>
          <p>© 2026 PRINTK RoboMaster Team</p>
          <div className="home-records" aria-label="备案信息">
            <a href="https://beian.miit.gov.cn/" rel="noreferrer" target="_blank">
              黔ICP备2026012872号-1
            </a>
            <a href="https://beian.mps.gov.cn/#/query/webSearch?code=52011102003163" rel="noreferrer" target="_blank">
              <Image src="/police-record-icon.png" alt="" width={18} height={20} />
              贵公网安备52011102003163号
            </a>
          </div>
        </div>
      </footer>

      <div className="home-floating-actions">
        <a className="home-top-fab" href="#top" aria-label="回到顶部" title="回到顶部">
          <svg aria-hidden="true" viewBox="0 0 32 32">
            <path d="M16 25V7M9 14l7-7 7 7" />
          </svg>
        </a>
        <Link className="home-reward-fab" href="/rewards" aria-label="奖励分排行" title="奖励分排行">
          <span className="home-reward-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </Link>
        <a className="home-contact-fab" href="#home-contact" aria-label="联系我们" title="联系我们">
          <svg aria-hidden="true" viewBox="0 0 32 32">
            <path d="M6 17v-2a10 10 0 0 1 20 0v2" />
            <path d="M6 16H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2ZM26 16h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2ZM26 24c0 3-2.5 5-6 5h-2" />
          </svg>
        </a>
      </div>
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
