import Link from "next/link";
import { robotRoles } from "@/lib/robots";

export default function RobotsPage() {
  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">ROLES</span>
        <h1>兵种展示</h1>
        <p>兵种资料按独立页面归档，点击兵种卡片即可查看定位、负责组别、训练重点和交付资料。</p>
      </section>
      <section className="section">
        <div className="card-grid">
          {robotRoles.map((robot) => (
            <Link className="card robot-card" href={`/robots/${robot.id}`} key={robot.id}>
              <span className="badge">{robot.group}</span>
              <h3>{robot.name}</h3>
              <p>{robot.role}</p>
              <p>{robot.overview}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
