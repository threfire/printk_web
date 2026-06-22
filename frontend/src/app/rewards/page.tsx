import { API_BASE, type RewardRankingData } from "@/lib/api";

async function fetchRewardRanking(): Promise<RewardRankingData> {
  try {
    const response = await fetch(`${API_BASE}/api/reward-ranking`, { cache: "no-store" });
    if (!response.ok) {
      return { ranking: [] };
    }
    return (await response.json()) as RewardRankingData;
  } catch {
    return { ranking: [] };
  }
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export default async function RewardsPage() {
  const data = await fetchRewardRanking();

  return (
    <div className="page">
      <section className="section-hero reward-hero">
        <span className="eyebrow">REWARD RANKING</span>
        <h1>奖励分排行</h1>
        <p>正式队员和老队员账号的奖励分按分数排序展示，积分跟随账号持久保存。</p>
      </section>

      <section className="section reward-ranking-section">
        <div className="section-heading">
          <span className="eyebrow">TOP LIST</span>
          <h2>排行</h2>
        </div>
        <div className="reward-podium">
          {data.ranking.slice(0, 3).map((item) => (
            <article className="reward-podium-card" data-rank={item.rank} key={item.account}>
              <span>#{item.rank}</span>
              <strong>{item.reward_score}</strong>
              <h3>{item.full_name || item.account}</h3>
              <p>{item.member_status} · {text(item.department)}</p>
            </article>
          ))}
        </div>
        <div className="table-wrap">
          <table className="reward-ranking-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>账号</th>
                <th>姓名</th>
                <th>身份</th>
                <th>部门</th>
                <th>奖励分</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.map((item) => (
                <tr key={item.account}>
                  <td><strong>#{item.rank}</strong></td>
                  <td>{item.account}</td>
                  <td>{item.full_name}</td>
                  <td><span className="badge">{item.member_status}</span></td>
                  <td>{text(item.department)}</td>
                  <td><strong>{item.reward_score}</strong></td>
                </tr>
              ))}
              {data.ranking.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    当前暂无奖励分排行数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
