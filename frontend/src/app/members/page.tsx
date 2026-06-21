import Image from "next/image";
import Link from "next/link";

type MemberStatus = "active" | "retired";

type Member = {
  id: string;
  name: string;
  status: MemberStatus;
  retirementYear?: string;
  group: string;
  role: string;
  grade: string;
  photo: string;
  summary: string;
  details: string;
  focus: string[];
};

const members: Member[] = [
  {
    id: "huang-control",
    name: "黄同学",
    status: "active",
    group: "电控组",
    role: "电控联调",
    grade: "大三",
    photo: "/home-carousel/team-01.jpeg",
    summary: "负责电控链路、联调记录和赛前参数固化。",
    details: "负责底盘、云台、通信链路和现场联调，把训练反馈整理为参数记录和问题清单。",
    focus: ["电控联调", "参数固化", "训练记录"],
  },
  {
    id: "chen-mechanical",
    name: "陈俊轩",
    status: "active",
    group: "机械组",
    role: "结构装配",
    grade: "大二",
    photo: "/home-carousel/team-04.jpeg",
    summary: "负责机械结构装配、维护检查和加工跟进。",
    details: "跟进结构方案、零件加工、装配质量和赛后维护，让机器人保持稳定训练状态。",
    focus: ["结构装配", "加工跟进", "维护检查"],
  },
  {
    id: "active-control-01",
    name: "电控队员 01",
    status: "active",
    group: "电控组",
    role: "底盘控制",
    grade: "大二",
    photo: "/home-carousel/team-05.jpeg",
    summary: "维护底盘控制、功率限制和调参表。",
    details: "负责底盘响应、功率控制和训练数据记录，支持步兵与英雄兵种的稳定机动。",
    focus: ["底盘控制", "功率限制", "调参表"],
  },
  {
    id: "active-control-02",
    name: "电控队员 02",
    status: "active",
    group: "电控组",
    role: "嵌入式开发",
    grade: "大一",
    photo: "/home-carousel/team-13.jpeg",
    summary: "维护固件版本、外设驱动和通信状态。",
    details: "负责嵌入式模块、传感器状态和通信异常记录，让控制链路形成可追溯资料。",
    focus: ["固件版本", "外设驱动", "通信状态"],
  },
  {
    id: "active-mechanical-01",
    name: "机械队员 01",
    status: "active",
    group: "机械组",
    role: "云台结构",
    grade: "大三",
    photo: "/home-carousel/team-10.jpg",
    summary: "负责云台结构、装甲板安装和维护备件。",
    details: "围绕射击稳定性、结构刚度和维护效率推进设计迭代，沉淀图纸清单和装配记录。",
    focus: ["云台结构", "图纸清单", "备件维护"],
  },
  {
    id: "active-mechanical-02",
    name: "机械队员 02",
    status: "active",
    group: "机械组",
    role: "取放机构",
    grade: "大二",
    photo: "/home-carousel/team-12.jpeg",
    summary: "负责工程兵种取放机构与可靠性测试。",
    details: "维护机构检查表、装配问题记录和训练损耗清单，为工程兵种任务提供稳定结构支持。",
    focus: ["取放机构", "可靠性测试", "损耗清单"],
  },
  {
    id: "active-algorithm-01",
    name: "算法队员 01",
    status: "active",
    group: "算法组",
    role: "运动策略",
    grade: "大二",
    photo: "/home-carousel/team-11.jpg",
    summary: "维护运动策略、仿真数据和复盘脚本。",
    details: "把训练轨迹、赛场反馈和策略脚本整理为可复用资料，支持兵种协同与自动化能力迭代。",
    focus: ["运动策略", "仿真数据", "复盘脚本"],
  },
  {
    id: "active-vision-01",
    name: "视觉队员 01",
    status: "active",
    group: "视觉组",
    role: "识别定位",
    grade: "大一",
    photo: "/home-carousel/team-03.jpeg",
    summary: "维护识别模型、相机标定和测试报告。",
    details: "负责装甲板识别、场地感知和标定流程记录，让视觉链路形成稳定交付。",
    focus: ["识别模型", "相机标定", "测试报告"],
  },
  {
    id: "active-operation-01",
    name: "运营队员 01",
    status: "active",
    group: "运营组",
    role: "物资财务",
    grade: "大二",
    photo: "/home-carousel/team-07.jpeg",
    summary: "维护采购记录、报销批次和物资台账。",
    details: "负责物资、财务、赛事文档和跨组协同，让训练与出赛流程保持清晰。",
    focus: ["物资台账", "报销批次", "赛事文档"],
  },
  {
    id: "retired-2025-control",
    name: "2025 退役电控队员",
    status: "retired",
    retirementYear: "2025",
    group: "电控组",
    role: "控制链路传承",
    grade: "往届队员",
    photo: "/home-carousel/team-09.jpg",
    summary: "沉淀底盘控制、云台联调和赛场应急经验。",
    details: "保留控制代码阅读路径、参数回溯记录和联调建议，为现役队员提供传承资料。",
    focus: ["代码传承", "调参经验", "赛场复盘"],
  },
  {
    id: "retired-2025-mechanical",
    name: "2025 退役机械队员",
    status: "retired",
    retirementYear: "2025",
    group: "机械组",
    role: "结构经验传承",
    grade: "往届队员",
    photo: "/home-carousel/team-08.png",
    summary: "沉淀结构方案、装配流程和检修记录。",
    details: "保留加工装配、可靠性维护和赛后检修经验，为新赛季结构选型提供历史依据。",
    focus: ["方案归档", "装配经验", "检修记录"],
  },
  {
    id: "retired-2024-operation",
    name: "2024 退役运营队员",
    status: "retired",
    retirementYear: "2024",
    group: "运营组",
    role: "赛事与管理传承",
    grade: "往届队员",
    photo: "/home-carousel/team-06.jpeg",
    summary: "沉淀赛事组织、财务记录和宣传流程。",
    details: "保留采购报销、赛事报名、宣传物料和跨组协调经验，帮助团队延续稳定运营节奏。",
    focus: ["赛事组织", "财务记录", "流程归档"],
  },
  {
    id: "retired-2023-vision",
    name: "2023 退役视觉队员",
    status: "retired",
    retirementYear: "2023",
    group: "视觉组",
    role: "视觉链路传承",
    grade: "往届队员",
    photo: "/home-carousel/team-02.jpeg",
    summary: "沉淀识别链路、标定流程和测试样例。",
    details: "保留模型迭代记录、标定文件和赛场识别问题复盘，为后续视觉训练提供基础资料。",
    focus: ["模型迭代", "标定文件", "问题复盘"],
  },
];

const activeMembers = members.filter((member) => member.status === "active");
const retiredMembers = members.filter((member) => member.status === "retired");
const retirementYears = Array.from(new Set(retiredMembers.map((member) => member.retirementYear ?? "往届"))).sort(
  (a, b) => Number(b) - Number(a),
);

function MemberWall({ members, sectionId }: { members: Member[]; sectionId: string }) {
  return (
    <div className="member-wall">
      {members.map((member) => (
        <article className="member-photo-card" key={member.id}>
          <Link className="member-photo-link" href={`/members#${member.id}`}>
            <Image
              className="member-photo"
              src={member.photo}
              alt={`${member.name}风采照片`}
              width={520}
              height={620}
              sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
            <div className="member-basic">
              <span className="badge">{member.status === "active" ? "现役队员" : `${member.retirementYear} 退役`}</span>
              <h3>{member.name}</h3>
              <p>{member.group} / {member.role}</p>
              <p>{member.summary}</p>
            </div>
          </Link>
          <div className="member-detail-overlay" id={member.id}>
            <Link className="member-detail-dismiss" href={`/members#${sectionId}`} aria-label="关闭详情" />
            <article className="member-detail-card" role="dialog" aria-labelledby={`${member.id}-title`}>
              <Image
                className="member-detail-photo"
                src={member.photo}
                alt={`${member.name}详细照片`}
                width={760}
                height={520}
                sizes="(max-width: 760px) 100vw, 42vw"
              />
              <div className="member-detail-copy">
                <span className="badge">{member.status === "active" ? "现役队员" : `${member.retirementYear} 退役队员`}</span>
                <h3 id={`${member.id}-title`}>{member.name}</h3>
                <p className="member-detail-role">{member.grade} / {member.group} / {member.role}</p>
                <p>{member.details}</p>
                <div className="member-focus-list">
                  {member.focus.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <Link className="button" href={`/members#${sectionId}`}>
                  返回照片墙
                </Link>
              </div>
            </article>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function MembersPage() {
  return (
    <div className="page">
      <section className="section-hero" id="all-members">
        <span className="eyebrow">MEMBERS</span>
        <h1>队员</h1>
        <p>照片墙展示全体队员基础信息；点击照片后进入详细资料，查看队员经历、负责方向和资料沉淀。</p>
      </section>

      <section className="section member-section" id="active-members">
        <div className="section-heading">
          <span className="eyebrow">ACTIVE</span>
          <h2>现役队员</h2>
        </div>
        <MemberWall members={activeMembers} sectionId="active-members" />
      </section>

      <section className="section member-section" id="retired-members">
        <div className="section-heading">
          <span className="eyebrow">ALUMNI</span>
          <h2>退役队员</h2>
        </div>
        <div className="retired-year-list">
          {retirementYears.map((year) => {
            const yearMembers = retiredMembers.filter((member) => (member.retirementYear ?? "往届") === year);
            return (
              <section className="retired-year-group" id={`retired-${year}`} key={year}>
                <div className="retired-year-heading">
                  <h3>{year} 年退役队员</h3>
                  <span>{yearMembers.length} 人</span>
                </div>
                <MemberWall members={yearMembers} sectionId={`retired-${year}`} />
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
