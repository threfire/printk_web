const groups = ["电控组", "机械组", "算法组", "视觉组", "运营组"];

export default function SeasonPlanPage() {
  return (
    <div className="page">
      <section className="panel">
        <span className="eyebrow">SEASON PLAN</span>
        <h1>赛季月度规划</h1>
        <p>第一阶段先提供展示骨架，后续接入赛季、月份、组别任务和组长独立密码。</p>
      </section>
      <section className="section panel">
        <h2>2026 赛季 6 月计划</h2>
        <div className="card-grid">
          {groups.map((group) => (
            <article className="card" key={group}>
              <span className="badge">未开始</span>
              <h3>{group}</h3>
              <p>等待录入本组月度目标、负责人、截止日期和进度。</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
