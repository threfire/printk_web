const robots = [
  {
    name: "英雄机器人",
    role: "高能量机关与远距离打击",
    group: "机械组 / 电控组 / 视觉组",
    focus: "完成云台稳定、弹道补偿和装甲板识别链路联调。",
    deliverable: "射击精度记录、云台控制参数、视觉识别测试报告",
  },
  {
    name: "步兵机器人",
    role: "场地对抗与快速机动",
    group: "机械组 / 电控组 / 算法组",
    focus: "提升底盘响应、功率控制和自动巡航基础能力。",
    deliverable: "底盘调参表、功率曲线、机动测试复盘",
  },
  {
    name: "工程机器人",
    role: "资源岛作业与补给支援",
    group: "机械组 / 电控组 / 运营组",
    focus: "围绕取放机构、补给路径和可靠性维护建立作业清单。",
    deliverable: "机构检查表、作业流程、备件与维修记录",
  },
];

export default function RobotsPage() {
  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">ROBOTS</span>
        <h1>机器人展示</h1>
        <p>机器人资料按赛季归档，展示定位、负责组别、当前重点和交付物。</p>
      </section>
      <section className="section">
        <div className="card-grid">
          {robots.map((robot) => (
            <article className="card robot-card" key={robot.name}>
              <span className="badge">{robot.group}</span>
              <h3>{robot.name}</h3>
              <p>{robot.role}</p>
              <p>
                <strong>当前重点：</strong>
                {robot.focus}
              </p>
              <p>
                <strong>交付物：</strong>
                {robot.deliverable}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
