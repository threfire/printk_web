import Link from "next/link";

export default function CampusCompetitionPage() {
  return (
    <div className="page campus-competition-page">
      <section className="section-hero campus-competition-coming-soon">
        <span className="eyebrow">2027 CAMPUS COMPETITION</span>
        <h1>2027贵州大学机甲大师校内赛</h1>
        <p>敬请期待</p>
        <Link className="ghost-button" href="/">返回首页</Link>
      </section>
    </div>
  );
}
