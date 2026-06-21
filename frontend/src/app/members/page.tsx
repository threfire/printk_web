const groups = [
  {
    name: "电控组",
    desc: "负责底盘、云台、通信链路和嵌入式控制。",
    lead: "控制链路与调参节奏",
    output: "固件版本、参数表、联调记录",
  },
  {
    name: "机械组",
    desc: "负责结构设计、加工装配、维护和可靠性迭代。",
    lead: "结构方案与装配质量",
    output: "图纸清单、装配记录、维护手册",
  },
  {
    name: "算法组",
    desc: "负责运动控制、策略规划和数据分析工具。",
    lead: "运动策略与仿真复盘",
    output: "策略脚本、仿真数据、测试结论",
  },
  {
    name: "视觉组",
    desc: "负责识别、定位、相机标定和赛场感知能力。",
    lead: "识别链路与标定流程",
    output: "模型版本、标定文件、识别报告",
  },
  {
    name: "运营组",
    desc: "负责物资、财务、宣传、文档和赛事协同。",
    lead: "物资台账与赛务协同",
    output: "采购记录、报销批次、宣传素材",
  },
];

export default function MembersPage() {
  return (
    <div className="page">
      <section className="section-hero">
        <span className="eyebrow">MEMBERS</span>
        <h1>队员风采</h1>
        <p>成员展示按组别维护，当前页面展示各组职责、负责重点和可沉淀资料。</p>
      </section>
      <section className="section">
        <div className="card-grid">
          {groups.map((group) => (
            <article className="card member-card" key={group.name}>
              <h3>{group.name}</h3>
              <p>{group.desc}</p>
              <p>
                <strong>负责重点：</strong>
                {group.lead}
              </p>
              <p>
                <strong>资料沉淀：</strong>
                {group.output}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
