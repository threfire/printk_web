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
    <div className="page robot-planning-page">
      <section className="robot-plan-header">
        <div>
          <span className="eyebrow">ROBOT SEASON PLAN</span>
          <h1>{robot.name}</h1>
          <p>{robot.overview}</p>
        </div>
        <Link className="ghost-button" href="/season-plan">
          返回月度规划
        </Link>
      </section>

      <section className="robot-plan-brief" aria-label="兵种赛季摘要">
        <div className="brief-main">
          <span className="badge">{robot.group}</span>
          <strong>{robot.role}</strong>
          <p>{robot.focus}</p>
        </div>
        <dl className="brief-grid">
          <div>
            <dt>赛季负责人</dt>
            <dd>{robot.seasonLead}</dd>
          </div>
          <div>
            <dt>机械组</dt>
            <dd>{robot.mechanicalLead}</dd>
          </div>
          <div>
            <dt>电控组</dt>
            <dd>{robot.electricalLead}</dd>
          </div>
          <div>
            <dt>算法组</dt>
            <dd>{robot.algorithmLead}</dd>
          </div>
          <div>
            <dt>赛季需求</dt>
            <dd>{robot.seasonNeeds.join(" / ")}</dd>
          </div>
          <div>
            <dt>验收目标</dt>
            <dd>{robot.acceptanceGoals.join(" / ")}</dd>
          </div>
        </dl>
      </section>

      <section className="robot-planning-windows" aria-label="规划窗口">
        <article className="planning-window season-window">
          <div className="window-title-row">
            <div>
              <span className="eyebrow">SEASON CURVE</span>
              <h2>赛季进度点</h2>
            </div>
            <span className="permission-pill">组长编辑</span>
          </div>
          <div className="milestone-stage">
            <svg className="milestone-curve" viewBox="0 0 1000 260" aria-hidden="true">
              <polyline points="40,170 240,86 430,140 640,62 850,120 960,72" />
            </svg>
            <div className="milestone-nodes">
              {robot.milestones.map((milestone, index) => (
                <details
                  className={`milestone-node milestone-node-${index + 1} ${milestone.done ? "is-done" : ""}`}
                  key={milestone.title}
                >
                  <summary>
                    <span>{milestone.date}</span>
                    <strong>{milestone.title}</strong>
                  </summary>
                  <p>{milestone.summary}</p>
                  <small>{milestone.owner}</small>
                </details>
              ))}
            </div>
          </div>
        </article>

        <article className="planning-window month-window">
          <div className="window-title-row">
            <div>
              <span className="eyebrow">CURRENT MONTH</span>
              <h2>当月进度</h2>
            </div>
            <span className="permission-pill">组长编辑</span>
          </div>
          <div className="monthly-task-board">
            {robot.monthlyTasks.map((task) => (
              <div className="monthly-task-row" key={task.title}>
                <span className={`task-check ${task.done ? "task-check-done" : ""}`}>✅</span>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.node}</p>
                </div>
                <small>{task.owner}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="planning-window week-window">
          <div className="window-title-row">
            <div>
              <span className="eyebrow">WEEKLY LOG</span>
              <h2>周常进展</h2>
            </div>
            <span className="permission-pill">组长与组员编辑</span>
          </div>
          <div className="weekly-log-list">
            {robot.weeklyUpdates.map((item) => (
              <article className="weekly-log-row" key={item.week}>
                <span>{item.week}</span>
                <strong>{item.progress}</strong>
                <small>{item.owner}</small>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
