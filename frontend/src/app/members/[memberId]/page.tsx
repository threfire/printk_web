/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE } from "@/lib/api";

type PublicMember = {
  id: string;
  account: string;
  name: string;
  membership_state: "active" | "retired";
  member_status: string;
  cohort: string;
  group: string;
  role: string;
  grade: string;
  bio: string;
  photo_url: string;
};

async function fetchMembers(): Promise<PublicMember[]> {
  try {
    const response = await fetch(`${API_BASE}/api/members`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { members?: PublicMember[] };
    return data.members ?? [];
  } catch {
    return [];
  }
}

export default async function MemberDetailPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const members = await fetchMembers();
  const memberIndex = members.findIndex((item) => item.id === decodeURIComponent(memberId) || item.account === decodeURIComponent(memberId));
  const member = members[memberIndex];

  if (!member) {
    notFound();
  }

  const name = member.name || member.account;
  const group = member.group || "未分组";
  const role = member.role || "队员";
  const status = member.membership_state === "active" ? "现役队员" : `${member.cohort || "往届"} 退役队员`;

  return (
    <div className="page member-profile-page">
      <section className="member-profile-header">
        <div>
          <span className="eyebrow">MEMBER PROFILE</span>
          <h1>{name}</h1>
          <p>{group} / {role} / {member.grade || "队员"}</p>
        </div>
        <Link className="ghost-button" href="/members#all-members">
          返回队员页面
        </Link>
      </section>

      <article className="member-profile-card">
        {member.photo_url ? (
          <img className="member-profile-photo" src={member.photo_url} alt={`${name}个人照片`} />
        ) : (
          <span className="member-profile-photo member-photo-empty" aria-label={`${name}尚未上传个人照片`} />
        )}
        <div className="member-profile-copy">
          <span className="badge">{status}</span>
          <h2>{name}</h2>
          <p className="member-profile-role">{member.grade || "队员"} / {group} / {role}</p>
          <div className="member-profile-facts">
            <div><span>项目经历</span><strong>{member.bio || "资料待补充"}</strong></div>
            <div><span>负责机型</span><strong>{group || "资料待补充"}</strong></div>
            <div><span>参与赛事</span><strong>RoboMaster 高校系列赛</strong></div>
            <div><span>队内成长履历</span><strong>{member.cohort || member.member_status || "资料待补充"}</strong></div>
          </div>
        </div>
      </article>
    </div>
  );
}
