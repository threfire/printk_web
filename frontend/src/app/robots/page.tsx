import Link from "next/link";
import { robotRoles } from "@/lib/robots";

export default function RobotsPage() {
  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">ROBOT LINES</span>
        <h1>兵种机器人</h1>
        <p>舵轮英雄、全向英雄、舵轮步兵、全向步兵、舵轮哨兵、麦轮哨兵、轮腿步兵按独立页面展示赛季负责人、需求、验收目标和进度窗口。</p>
      </section>
      <section className="section">
        <div className="robot-directory-grid">
          {robotRoles.map((robot) => (
            <Link className="robot-directory-card" href={`/robots/${robot.id}`} key={robot.id}>
              <span className="badge">{robot.group}</span>
              <h3>{robot.name}</h3>
              <p>{robot.role}</p>
              <small>{robot.deliverable}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
