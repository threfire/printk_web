const robots = [
  {
    id: "hero",
    name: "英雄兵种",
    role: "高能量机关与远距离打击",
    group: "机械组 / 电控组 / 视觉组",
    focus: "完成云台稳定、弹道补偿和装甲板识别链路联调。",
    deliverable: "射击精度记录、云台控制参数、视觉识别测试报告",
  },
  {
    id: "infantry",
    name: "步兵兵种",
    role: "场地对抗与快速机动",
    group: "机械组 / 电控组 / 算法组",
    focus: "提升底盘响应、功率控制和自动巡航基础能力。",
    deliverable: "底盘调参表、功率曲线、机动测试复盘",
  },
  {
    id: "engineer",
    name: "工程兵种",
    role: "资源岛作业与补给支援",
    group: "机械组 / 电控组 / 运营组",
    focus: "围绕取放机构、补给路径和可靠性维护建立作业清单。",
    deliverable: "机构检查表、作业流程、备件与维修记录",
  },
  {
    id: "sentry",
    name: "哨兵兵种",
    role: "自动巡航与防区控制",
    group: "电控组 / 算法组 / 视觉组",
    focus: "建立导航、识别、避障和状态监控链路。",
    deliverable: "巡航路径记录、识别测试报告、异常状态清单",
  },
  {
    id: "drone",
    name: "无人机兵种",
    role: "空中侦察与战术支援",
    group: "电控组 / 视觉组 / 算法组",
    focus: "维护飞控状态、图传链路和空中识别流程。",
    deliverable: "飞控参数、图传测试记录、任务流程表",
  },
  {
    id: "radar",
    name: "雷达兵种",
    role: "全局感知与信息支援",
    group: "视觉组 / 算法组 / 运营组",
    focus: "维护场地感知、目标标注和信息同步流程。",
    deliverable: "标注数据、识别报告、信息同步记录",
  },
  {
    id: "dart",
    name: "飞镖兵种",
    role: "定点发射与机构可靠性",
    group: "机械组 / 电控组 / 视觉组",
    focus: "完成发射机构、瞄准链路和赛前检查流程。",
    deliverable: "发射测试记录、机构检查表、瞄准参数",
  },
];

export default function RobotsPage() {
  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">ROLES</span>
        <h1>兵种展示</h1>
        <p>兵种资料按赛季归档，展示定位、负责组别、当前重点和交付物。</p>
      </section>
      <section className="section">
        <div className="card-grid">
          {robots.map((robot) => (
            <article className="card robot-card anchor-card" id={robot.id} key={robot.id}>
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
