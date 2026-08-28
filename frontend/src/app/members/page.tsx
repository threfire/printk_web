/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { API_BASE } from "@/lib/api";

type MemberStatus = "active" | "retired";

type PublicMember = {
  id: string;
  account: string;
  name: string;
  gender: string;
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
  domId: string;
  name: string;
  gender: string;
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

function memberDomId(value: string) {
  return `member-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function toMember(member: PublicMember, index: number): Member {
  const group = member.group || "未分组";
  const role = member.role || "队员";
  const grade = member.grade || member.member_status || "队员";
  const name = member.name || member.account;
  const id = member.id || member.account || String(index);
  return {
    id,
    domId: memberDomId(id),
    name,
    gender: member.gender,
    status: member.membership_state,
    cohort: "",
    group,
    role,
    grade,
    photo: member.photo_url,
    summary: uniqueItems([grade, group, role]).join(" · "),
    details: member.bio || `${name}在战队中负责${role}方向，当前归属${group}。`,
    focus: uniqueItems([grade, group, role]),
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
  return member.status === "active" ? "" : "退役队员";
}

function MemberPhoto({ member, className, detail = false }: { member: Member; className: string; detail?: boolean }) {
  if (!member.photo) {
    return <span className={`${className} member-photo-empty ${member.gender === "男" ? "member-photo-male" : member.gender === "女" ? "member-photo-female" : ""}`} aria-label={`${member.name}尚未上传个人照片`} />;
  }
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
          <Link className="member-photo-link" href={`/members/${encodeURIComponent(member.id)}`}>
            <MemberPhoto className="member-photo" member={member} />
            <div className="member-basic">
              {statusText(member) ? <span className="badge">{statusText(member)}</span> : null}
              <h3>{member.name}</h3>
              <p>{member.group} / {member.role}</p>
              <p>{member.summary}</p>
            </div>
          </Link>
          <div className="member-detail-overlay" id={member.domId}>
            <Link className="member-detail-dismiss" href={`/members#${sectionId}`} aria-label="关闭详情" />
            <article className="member-detail-card" role="dialog" aria-labelledby={`${member.domId}-title`}>
              <MemberPhoto className="member-detail-photo" detail member={member} />
              <div className="member-detail-copy">
                <span className="badge">{statusText(member)}</span>
                <h3 id={`${member.domId}-title`}>{member.name}</h3>
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

  return (
    <div className="page">
      <section className="section-hero" id="all-members">
        <span className="eyebrow">MEMBERS</span>
        <h1>队员</h1>
        <p>统一头像卡片展示全体队员姓名与队内职务；点击卡片进入专属详情页，记录项目经历、负责机型、参与赛事与成长履历。</p>
      </section>

      <section className="section member-section" id="active-members">
        {activeMembers.length ? <MemberWall members={activeMembers} sectionId="active-members" /> : <p className="muted">当前没有现役队员资料。</p>}
      </section>

      <section className="section member-section" id="retired-members">
        <div className="section-heading">
          <span className="eyebrow">ALUMNI</span>
          <h2>退役队员</h2>
        </div>
        {retiredMembers.length ? (
          <MemberWall members={retiredMembers} sectionId="retired-members" />
        ) : (
          <p className="muted">当前没有退役队员资料。</p>
        )}
      </section>
    </div>
  );
}
