import Link from "next/link";

const competitionTracks = [
  {
    href: "/campus-competition/challenge",
    index: "01",
    title: "挑战赛",
    subtitle: "REAL ROBOT 1V1",
    description: "操作真正的 RoboMaster 步兵机器人，在标准对抗环境中完成 1v1 竞技。",
  },
  {
    href: "/campus-competition/versus",
    index: "02",
    title: "对抗赛",
    subtitle: "MINI ROBOT 1V1",
    description: "自主制作微缩版步兵机器人，搭载小型裁判系统装甲板，在缩小版场地中展开 1v1 对抗。",
  },
];

export default function CampusCompetitionPage() {
  return (
    <div className="page campus-competition-page">
      <section className="campus-competition-selector" aria-labelledby="campus-competition-title">
        <header className="campus-competition-heading">
          <span className="eyebrow">2027 CAMPUS COMPETITION</span>
          <h1 id="campus-competition-title">贵州大学机甲大师校内赛</h1>
          <p>选择赛项，查看比赛说明、赛程安排与报名方式。</p>
        </header>

        <div className="campus-track-grid">
          {competitionTracks.map((track) => (
            <Link className="campus-track-card" href={track.href} key={track.href}>
              <span className="campus-track-index">{track.index}</span>
              <small>{track.subtitle}</small>
              <h2>{track.title}</h2>
              <p>{track.description}</p>
              <strong>进入赛项 <i aria-hidden="true">→</i></strong>
            </Link>
          ))}
        </div>

        <Link className="ghost-button campus-back-link" href="/">返回首页</Link>
      </section>
    </div>
  );
}
