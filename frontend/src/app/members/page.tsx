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

const memberPhotos = [
  "/home-carousel/team-01.jpeg",
  "/home-carousel/team-02.jpeg",
  "/home-carousel/team-03.jpeg",
  "/home-carousel/team-04.jpeg",
  "/home-carousel/team-05.jpeg",
  "/home-carousel/team-06.jpeg",
  "/home-carousel/team-07.jpeg",
  "/home-carousel/team-09.jpg",
  "/home-carousel/team-10.jpg",
  "/home-carousel/team-11.jpg",
  "/home-carousel/team-12.jpeg",
  "/home-carousel/team-13.jpeg",
];

const memberSeeds = [
  { name: "陈俊轩", group: "队长", role: "队长 / 机械组负责人" },
  { name: "刘振豪", group: "项管", role: "项目管理" },
  { name: "张朝阳", group: "项管 / 硬件组", role: "项目管理 / 硬件组负责人" },
  { name: "曾宰丹", group: "项管 / 运营组", role: "财务 / 项目管理" },
  { name: "周玉威", group: "机械组", role: "步兵机械" },
  { name: "敖敬淳", group: "机械组", role: "步兵 / 仿生负责人" },
  { name: "张鑫豪", group: "机械组", role: "步兵机械" },
  { name: "赵博文", group: "机械组", role: "步兵机械" },
  { name: "姚博文", group: "机械组", role: "英雄机械" },
  { name: "董益辉", group: "机械组", role: "英雄机械" },
  { name: "练俊轩", group: "机械组", role: "英雄机械" },
  { name: "唐媛林", group: "机械组", role: "英雄机械" },
  { name: "石翔", group: "机械组", role: "哨兵机械" },
  { name: "万易鹏", group: "机械组", role: "哨兵机械" },
  { name: "仇松", group: "机械组", role: "哨兵机械" },
  { name: "温浩浩", group: "机械组", role: "工程机械" },
  { name: "田家豪", group: "机械组", role: "工程机械" },
  { name: "陆秋奕", group: "机械组", role: "工程机械" },
  { name: "叶朝天", group: "机械组", role: "工程机械" },
  { name: "黄锐", group: "电控组", role: "电控组负责人" },
  { name: "欧鸥", group: "电控组", role: "步兵电控" },
  { name: "杨明鑫", group: "电控组", role: "步兵 / 仿生电控" },
  { name: "敖毅", group: "电控组", role: "步兵电控" },
  { name: "杜佳佳", group: "电控组", role: "步兵电控" },
  { name: "罗俊俊", group: "电控组", role: "步兵 / 英雄电控" },
  { name: "陈杰", group: "电控组", role: "哨兵负责人" },
  { name: "杨尚靖", group: "电控组", role: "哨兵电控" },
  { name: "何哲", group: "电控组", role: "工程电控" },
  { name: "肖哲", group: "电控组", role: "工程电控" },
  { name: "周柏森", group: "电控组", role: "仿生电控" },
  { name: "陈星", group: "电控组", role: "仿生电控" },
  { name: "王硕", group: "硬件组", role: "硬件设计" },
  { name: "曹睿中", group: "硬件组", role: "硬件设计" },
  { name: "黄皓", group: "硬件组", role: "硬件调试" },
  { name: "杨嘉雯", group: "硬件组", role: "硬件调试" },
  { name: "张荣勋", group: "算法组", role: "算法组负责人" },
  { name: "杨阳", group: "算法组", role: "算法开发" },
  { name: "杨胜娟", group: "运营组", role: "运营组负责人" },
  { name: "石娟", group: "运营组", role: "运营协作" },
];

const members: Member[] = memberSeeds.map((member, index) => ({
  id: `member-${index + 1}`,
  name: member.name,
  status: "active",
  group: member.group,
  role: member.role,
  grade: "现役队员",
  photo: memberPhotos[index % memberPhotos.length],
  summary: `${member.group} · ${member.role}`,
  details: `${member.name}在战队架构中负责${member.role}方向，当前归属${member.group}。`,
  focus: [member.group, member.role, "队内协作"],
}));

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
        {retiredMembers.length ? (
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
        ) : (
          <p className="muted">当前按现有架构展示现役队员资料。</p>
        )}
      </section>
    </div>
  );
}
