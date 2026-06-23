import { cookies } from "next/headers";
import Link from "next/link";
import {
  departmentOptions,
  genderOptions,
  gradeOptions,
  memberStatusOptions,
  type SiteAccountProfile,
} from "@/lib/account-profile";
import { API_BASE } from "@/lib/api";

const emptyProfile: SiteAccountProfile = {
  account: "",
  full_name: "",
  gender: "",
  grade: "",
  member_status: "",
  permission_level: "",
  department: "",
  phone: "",
  email: "",
  bio: "",
  reward_score: 0,
  reward_eligible: false,
  image2_allowed: false,
  is_disabled: false,
};

async function getProfile(account: string): Promise<SiteAccountProfile> {
  const response = await fetch(`${API_BASE}/api/site-accounts/${encodeURIComponent(account)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return { ...emptyProfile, account };
  }
  return response.json() as Promise<SiteAccountProfile>;
}

function OptionList({ options }: { options: readonly string[] }) {
  return (
    <>
      <option value="">请选择</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </>
  );
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const accountFeedback = cookieStore.get("printk-account-feedback")?.value ?? "";

  if (!account) {
    return (
      <div className="page">
        <section className="section-hero">
          <span className="eyebrow">ACCOUNT</span>
          <h1>个人中心</h1>
          <p>登录账号后可维护姓名、年级、战队身份和部门信息。</p>
          <div className="hero-actions">
            <Link className="button" href="/#account-login">
              登录
            </Link>
            <Link className="ghost-button" href="/#account-register">
              注册
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const profile = await getProfile(account);

  return (
    <div className="page account-page">
      <section className="section-hero account-hero">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>个人中心</h1>
          <p>资料用于战队门户识别成员身份、年级、部门和联系方式。</p>
        </div>
        <div className="account-summary">
          <strong>{profile.full_name || profile.account}</strong>
          <span>{[profile.member_status, profile.permission_level, profile.department, profile.grade].filter(Boolean).join(" / ") || "资料待完善"}</span>
        </div>
      </section>

      {accountFeedback ? <p className="message">{accountFeedback}</p> : null}

      <section className="section account-layout">
        <article className="card profile-card">
          <span className="eyebrow">PROFILE</span>
          <h2>资料概览</h2>
          <dl className="profile-list">
            <div>
              <dt>账号</dt>
              <dd>{profile.account}</dd>
            </div>
            <div>
              <dt>姓名</dt>
              <dd>{profile.full_name || "未填写"}</dd>
            </div>
            <div>
              <dt>性别</dt>
              <dd>{profile.gender || "未填写"}</dd>
            </div>
            <div>
              <dt>年级</dt>
              <dd>{profile.grade || "未填写"}</dd>
            </div>
            <div>
              <dt>身份信息</dt>
              <dd>{profile.member_status || "未填写"}</dd>
            </div>
            <div>
              <dt>权限</dt>
              <dd>{profile.permission_level || "普通队员"}</dd>
            </div>
            <div>
              <dt>部门信息</dt>
              <dd>{profile.department || "未填写"}</dd>
            </div>
          </dl>
        </article>

        <article className="card profile-form-card">
          <span className="eyebrow">EDIT</span>
          <h2>编辑资料</h2>
          <form className="form profile-form" action="/account/profile" method="post">
            <input name="permission_level" type="hidden" value={profile.permission_level || "普通队员"} />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="profile-full-name">姓名</label>
                <input id="profile-full-name" name="full_name" defaultValue={profile.full_name} placeholder="真实姓名" />
              </div>
              <div className="field">
                <label htmlFor="profile-gender">性别</label>
                <select id="profile-gender" name="gender" defaultValue={profile.gender}>
                  <OptionList options={genderOptions} />
                </select>
              </div>
              <div className="field">
                <label htmlFor="profile-grade">年级</label>
                <select id="profile-grade" name="grade" defaultValue={profile.grade}>
                  <OptionList options={gradeOptions} />
                </select>
              </div>
              <div className="field">
                <label htmlFor="profile-member-status">身份信息</label>
                <select id="profile-member-status" name="member_status" defaultValue={profile.member_status}>
                  <OptionList options={memberStatusOptions} />
                </select>
              </div>
              <div className="field">
                <label htmlFor="profile-department">部门信息</label>
                <select id="profile-department" name="department" defaultValue={profile.department}>
                  <OptionList options={departmentOptions} />
                </select>
              </div>
              <div className="field">
                <label htmlFor="profile-phone">联系电话</label>
                <input id="profile-phone" name="phone" defaultValue={profile.phone} placeholder="手机号或短号" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="profile-email">邮箱</label>
              <input id="profile-email" name="email" defaultValue={profile.email} placeholder="常用邮箱" />
            </div>
            <div className="field">
              <label htmlFor="profile-bio">个人说明</label>
              <textarea id="profile-bio" name="bio" defaultValue={profile.bio} rows={4} placeholder="方向、职责或备注" />
            </div>
            <div className="form-actions">
              <button className="button" type="submit">
                保存资料
              </button>
              <Link className="ghost-button" href="/">
                返回首页
              </Link>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}
