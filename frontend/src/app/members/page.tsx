import Image from "next/image";
import Link from "next/link";

type MemberStatus = "active" | "retired";

type Member = {
  id: string;
  name: string;
  status: MemberStatus;
  group: string;
  role: string;
  year: string;
  photo: string;
  summary: string;
  details: string;
  focus: string[];
};

const members: Member[] = [
  {
    id: "active-control",
    name: "电控组代表",
    status: "active",
    group: "电控组",
    role: "底盘与云台控制",
    year: "2026 赛季",
    photo: "/home-carousel/team-01.jpeg",
    summary: "负责通信链路、嵌入式控制和现场调参。",
    details: "参与底盘控制、云台联调、裁判系统通信和赛前参数固化，保证机器人在训练与比赛中保持稳定响应。",
    focus: ["控制链路", "参数固化", "联调记录"],
  },
  {
    id: "active-mechanical",
    name: "机械组代表",
    status: "active",
    group: "机械组",
    role: "结构设计与装配",
    year: "2026 赛季",
    photo: "/home-carousel/team-04.jpeg",
    summary: "负责结构方案、加工装配和可靠性维护。",
    details: "跟进机器人结构迭代、零件加工、装配质量和赛后维护，让机械系统支撑持续训练和高强度比赛。",
    focus: ["结构方案", "装配质量", "维护闭环"],
  },
  {
    id: "active-algorithm",
    name: "算法组代表",
    status: "active",
    group: "算法组",
    role: "运动策略与数据分析",
    year: "2026 赛季",
    photo: "/home-carousel/team-11.jpg",
    summary: "负责运动控制、策略脚本和数据复盘。",
    details: "沉淀仿真数据、训练日志和策略脚本，把赛场反馈转化为可复用的算法方案。",
    focus: ["策略脚本", "仿真数据", "训练复盘"],
  },
  {
    id: "active-vision",
    name: "视觉组代表",
    status: "active",
    group: "视觉组",
    role: "识别定位与标定",
    year: "2026 赛季",
    photo: "/home-carousel/team-13.jpeg",
    summary: "负责相机标定、识别链路和赛场感知。",
    details: "维护识别模型、标定流程和调试数据，让机器人获得稳定的目标识别与场地感知能力。",
    focus: ["模型版本", "标定流程", "识别报告"],
  },
  {
    id: "active-operation",
    name: "运营组代表",
    status: "active",
    group: "运营组",
    role: "物资与赛事协同",
    year: "2026 赛季",
    photo: "/home-carousel/team-07.jpeg",
    summary: "负责物资、财务、宣传和文档协同。",
    details: "维护采购记录、报销批次、宣传素材和赛事文档，让团队训练、出赛和管理流程保持清晰。",
    focus: ["物资台账", "报销批次", "宣传素材"],
  },
  {
    id: "retired-control",
    name: "退役电控队员",
    status: "retired",
    group: "电控组",
    role: "控制链路传承",
    year: "往届队员",
    photo: "/home-carousel/team-09.jpg",
    summary: "沉淀控制经验，支持新队员快速接手。",
    details: "保留底盘控制、云台调试和赛场应急经验，为现役队员提供代码阅读、参数回溯和联调建议。",
    focus: ["代码传承", "调参经验", "赛场复盘"],
  },
  {
    id: "retired-mechanical",
    name: "退役机械队员",
    status: "retired",
    group: "机械组",
    role: "结构经验传承",
    year: "往届队员",
    photo: "/home-carousel/team-10.jpg",
    summary: "沉淀结构方案，支撑后续赛季迭代。",
    details: "保留加工装配、可靠性维护和赛后检修经验，为新赛季结构选型提供历史依据。",
    focus: ["方案归档", "装配经验", "检修记录"],
  },
  {
    id: "retired-operation",
    name: "退役运营队员",
    status: "retired",
    group: "运营组",
    role: "赛事与管理传承",
    year: "往届队员",
    photo: "/home-carousel/team-12.jpeg",
    summary: "沉淀赛事组织、财务记录和宣传流程。",
    details: "保留采购报销、赛事报名、宣传物料和跨组协调经验，帮助团队延续稳定的运营节奏。",
    focus: ["赛事组织", "财务记录", "流程归档"],
  },
];

const activeMembers = members.filter((member) => member.status === "active");
const retiredMembers = members.filter((member) => member.status === "retired");

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
              <span className="badge">{member.year}</span>
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
                <span className="badge">{member.status === "active" ? "现役队员" : "退役队员"}</span>
                <h3 id={`${member.id}-title`}>{member.name}</h3>
                <p className="member-detail-role">{member.group} / {member.role}</p>
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
      <section className="section-hero">
        <span className="eyebrow">MEMBERS</span>
        <h1>队员风采</h1>
        <p>照片墙默认展示姓名、身份、组别和职责；点击照片后进入详细资料，查看队员经历、负责方向和资料沉淀。</p>
        <div className="member-jump-nav" aria-label="队员分类跳转">
          <Link className="button" href="/members#active-members">
            现役队员
          </Link>
          <Link className="ghost-button" href="/members#retired-members">
            退役队员
          </Link>
        </div>
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
        <MemberWall members={retiredMembers} sectionId="retired-members" />
      </section>
    </div>
  );
}
