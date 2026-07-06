/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { API_BASE } from "@/lib/api";

type MemberStatus = "active" | "retired";

type PublicMember = {
  id: string;
  account: string;
  name: string;
  membership_state: MemberStatus;
  member_status: string;
  cohort: string;
  group: string;
  role: string;
  grade: string;
  bio: string;
  photo_url: string;
};

type Member = {
  id: string;
  name: string;
  status: MemberStatus;
  cohort: string;
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

function memberDomId(value: string) {
  return `member-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function toMember(member: PublicMember, index: number): Member {
  const group = member.group || "未分组";
  const role = member.role || "队员";
  const cohort = member.cohort || "未填写届别";
  const grade = member.grade || member.member_status || "队员";
  const name = member.name || member.account;
  return {
    id: memberDomId(member.id || member.account || String(index)),
    name,
    status: member.membership_state,
    cohort,
    group,
    role,
    grade,
    photo: member.photo_url || memberPhotos[index % memberPhotos.length],
    summary: uniqueItems([cohort, group, role]).join(" · "),
    details: member.bio || `${name}在战队中负责${role}方向，当前归属${group}。`,
    focus: uniqueItems([cohort, group, role]),
  };
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch(`${API_BASE}/api/members`, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { members?: PublicMember[] };
  return (data.members ?? []).map(toMember);
}

function statusText(member: Member) {
  return member.status === "active" ? "在队队员" : `${member.cohort} 退队`;
}

function MemberPhoto({ member, className, detail = false }: { member: Member; className: string; detail?: boolean }) {
  return (
    <img
      className={className}
      src={member.photo}
      alt={`${member.name}${detail ? "详细照片" : "风采照片"}`}
      loading="lazy"
    />
  );
}

function MemberWall({ members, sectionId }: { members: Member[]; sectionId: string }) {
  return (
    <div className="member-wall">
      {members.map((member) => (
        <article className="member-photo-card" key={member.id}>
          <Link className="member-photo-link" href={`/members#${member.id}`}>
            <MemberPhoto className="member-photo" member={member} />
            <div className="member-basic">
              <span className="badge">{statusText(member)}</span>
              <h3>{member.name}</h3>
              <p>{member.group} / {member.role}</p>
              <p>{member.summary}</p>
            </div>
          </Link>
          <div className="member-detail-overlay" id={member.id}>
            <Link className="member-detail-dismiss" href={`/members#${sectionId}`} aria-label="关闭详情" />
            <article className="member-detail-card" role="dialog" aria-labelledby={`${member.id}-title`}>
              <MemberPhoto className="member-detail-photo" detail member={member} />
              <div className="member-detail-copy">
                <span className="badge">{statusText(member)}</span>
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

export default async function MembersPage() {
  const members = await fetchMembers();
  const activeMembers = members.filter((member) => member.status === "active");
  const retiredMembers = members.filter((member) => member.status === "retired");
  const retirementYears = Array.from(new Set(retiredMembers.map((member) => member.cohort))).sort((a, b) =>
    b.localeCompare(a, "zh-CN"),
  );

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
          <h2>在队队员</h2>
        </div>
        {activeMembers.length ? <MemberWall members={activeMembers} sectionId="active-members" /> : <p className="muted">当前没有在队队员资料。</p>}
      </section>

      <section className="section member-section" id="retired-members">
        <div className="section-heading">
          <span className="eyebrow">ALUMNI</span>
          <h2>退队队员</h2>
        </div>
        {retiredMembers.length ? (
          <div className="retired-year-list">
            {retirementYears.map((year) => {
              const yearMembers = retiredMembers.filter((member) => member.cohort === year);
              return (
                <section className="retired-year-group" id={`retired-${year}`} key={year}>
                  <div className="retired-year-heading">
                    <h3>{year} 退队队员</h3>
                    <span>{yearMembers.length} 人</span>
                  </div>
                  <MemberWall members={yearMembers} sectionId={`retired-${year}`} />
                </section>
              );
            })}
          </div>
        ) : (
          <p className="muted">当前没有退队队员资料。</p>
        )}
      </section>
    </div>
  );
}
