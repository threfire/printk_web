import Link from "next/link";
import { notFound } from "next/navigation";
import { getRobotRole, robotRoles } from "@/lib/robots";

export function generateStaticParams() {
  return robotRoles.map((robot) => ({ robotId: robot.id }));
}

export default async function RobotRolePage({ params }: { params: Promise<{ robotId: string }> }) {
  const { robotId } = await params;
  const robot = getRobotRole(robotId);

  if (!robot) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">ROLES / {robot.shortName.toUpperCase()}</span>
        <h1>{robot.name}</h1>
        <p>{robot.overview}</p>
        <div className="hero-actions">
          <Link className="ghost-button" href="/robots">
            返回兵种总览
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="card-grid">
          <article className="card robot-card">
            <span className="badge">定位</span>
            <h3>{robot.role}</h3>
            <p>{robot.focus}</p>
          </article>
          <article className="card robot-card">
            <span className="badge">负责组别</span>
            <h3>{robot.group}</h3>
            <p>跨组资料在同一兵种页面沉淀，训练、维护和赛前检查使用同一入口。</p>
          </article>
          <article className="card robot-card">
            <span className="badge">交付物</span>
            <h3>{robot.deliverable}</h3>
            <p>资料按赛季持续归档，支撑训练复盘、赛前检查和后续迭代。</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">TRAINING</span>
          <h2>训练重点</h2>
        </div>
        <div className="card-grid">
          {robot.training.map((item) => (
            <article className="card robot-card" key={item}>
              <h3>{item}</h3>
              <p>记录训练目标、负责人、结果和复盘结论，形成可追溯的兵种资料。</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">ARCHIVE</span>
          <h2>资料归档</h2>
        </div>
        <div className="card-grid">
          {robot.archive.map((item) => (
            <article className="card robot-card" key={item}>
              <h3>{item}</h3>
              <p>用于赛季复盘、问题追踪和下一轮训练计划维护。</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
