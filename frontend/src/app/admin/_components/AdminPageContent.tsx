import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminHomepageContent } from "./AdminHomepageContent";
import {
  API_BASE,
  type BatchDetailData,
  DashboardData,
  type ForumManagementData,
  type HomepageContentData,
} from "@/lib/api";
import {
  departmentOptions,
  genderOptions,
  gradeOptions,
  memberStatusOptions,
  type SiteAccountProfile,
} from "@/lib/account-profile";
import { firstParam } from "@/lib/admin-feedback";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export type AdminSection = "overview" | "home" | "accounts" | "rewards" | "forum" | "materials" | "batch";

type AdminPageContentProps = AdminPageProps & {
  section: AdminSection;
  batchDetail?: BatchDetailData | null;
  batchId?: string;
};

const adminNavItems = [
  { href: "/admin", label: "总览", section: "overview" },
  { href: "/admin/homepage", label: "首页内容", section: "home" },
  { href: "/admin/accounts", label: "账号管理", section: "accounts" },
  { href: "/admin/rewards", label: "奖励分", section: "rewards" },
  { href: "/admin/forum", label: "论坛审核", section: "forum" },
  { href: "/admin/materials", label: "发票审核", section: "materials" },
] satisfies Array<{ href: string; label: string; section: AdminSection }>;

const adminSectionTitles: Record<AdminSection, string> = {
  overview: "状态总览",
  home: "首页内容管理",
  accounts: "账号管理",
  rewards: "奖励分管理",
  forum: "论坛审核",
  materials: "发票审核",
  batch: "批次复核",
};

const adminSectionDescriptions: Record<AdminSection, string> = {
  overview: "查看关键数量和近期处理状态",
  home: "维护首页视频、轮播图片和文案",
  accounts: "筛选账号、调整资料和工具权限",
  rewards: "管理正式队员和老队员账号的奖励分",
  forum: "审核帖子与回复内容",
  materials: "处理入库批次、库内明细和报销表",
  batch: "查看单个批次的复核明细",
};

const adminReturnPaths: Record<AdminSection, string> = {
  overview: "/admin",
  home: "/admin/homepage",
  accounts: "/admin/accounts",
  rewards: "/admin/rewards",
  forum: "/admin/forum",
  materials: "/admin/materials",
  batch: "/admin/materials",
};

type AccountManagementData = {
  accounts: SiteAccountProfile[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    image2_allowed: number;
  };
};

async function fetchDashboard(token: string): Promise<DashboardData | null> {
  const response = await fetch(`${API_BASE}/api/invoices/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<DashboardData>;
}

async function fetchAccounts(token: string, filters: Record<string, string>): Promise<AccountManagementData | null> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const response = await fetch(`${API_BASE}/api/admin/site-accounts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<AccountManagementData>;
}

async function fetchForumManagement(token: string): Promise<ForumManagementData | null> {
  const response = await fetch(`${API_BASE}/api/admin/forum`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<ForumManagementData>;
}

async function fetchHomepageManagement(token: string): Promise<HomepageContentData | null> {
  const response = await fetch(`${API_BASE}/api/admin/homepage`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<HomepageContentData>;
}

function param(params: Record<string, string | string[] | undefined>, key: string) {
  return firstParam(params[key]) ?? "";
}

function OptionList({ options }: { options: readonly string[] }) {
  return (
    <>
      <option value="">全部</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </>
  );
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (raw === "-") {
    return raw;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function forumStatusText(value: string) {
  const labels: Record<string, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    hidden: "已隐藏",
  };
  return labels[value] ?? value;
}

function rewardSupported(account: SiteAccountProfile) {
  return account.member_status === "正式队员" || account.member_status === "老队员";
}

export async function AdminPageContent({ searchParams, section }: AdminPageContentProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("printk-admin-token")?.value ?? "";
  const params = (await searchParams) ?? {};
  const currentPath = adminReturnPaths[section];
  const accountFilters = {
    keyword: param(params, "keyword"),
    member_status: param(params, "member_status"),
    department: param(params, "department"),
    state: param(params, "state"),
    image2: param(params, "image2"),
  };
  const dashboard = token ? await fetchDashboard(token) : null;
  const accountData = token ? await fetchAccounts(token, accountFilters) : null;
  const forumData = token ? await fetchForumManagement(token) : null;
  const homepageData = token ? await fetchHomepageManagement(token) : null;
  const ok = firstParam(params.ok);
  const error = firstParam(params.error);

  if (token && (!dashboard || !accountData || !forumData || !homepageData)) {
    redirect("/api/admin/logout");
  }

  if (!dashboard || !accountData || !forumData || !homepageData) {
    return (
      <div className="page">
        <section className="section-hero">
          <span className="eyebrow">ADMIN</span>
          <h1>管理后台</h1>
          {ok ? <div className="message">{ok}</div> : null}
          {error ? <div className="message error">{error}</div> : null}
          <form className="form" action="/api/admin/login" method="post">
            <div className="field">
              <label htmlFor="password">管理员密码</label>
              <input id="password" name="password" type="password" required />
            </div>
            <button className="button" type="submit">
              登录
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (section === "batch") {
    return (
      <div className="page admin-page">
        <aside className="admin-sidebar" aria-label="管理后台导航">
          <div className="admin-sidebar-brand">
            <span className="eyebrow">ADMIN</span>
            <strong>管理后台</strong>
          </div>
          <nav className="admin-side-nav">
            {adminNavItems.map((item) => (
              <Link aria-current={item.section === "materials" ? "page" : undefined} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div>
              <span className="eyebrow">BATCH REVIEW</span>
              <h1>批次复核</h1>
              <p>查看单个批次的复核明细</p>
            </div>
            <div className="admin-topbar-actions">
              <form action="/api/admin/logout" method="post">
                <button className="ghost-button" type="submit">
                  退出登录
                </button>
              </form>
            </div>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <aside className="admin-sidebar" aria-label="管理后台导航">
        <div className="admin-sidebar-brand">
          <span className="eyebrow">ADMIN</span>
          <strong>管理后台</strong>
        </div>
        <nav className="admin-side-nav">
          {adminNavItems.map((item) => (
            <Link aria-current={item.section === section ? "page" : undefined} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">CONTROL</span>
            <h1>{adminSectionTitles[section]}</h1>
            <p>{adminSectionDescriptions[section]}</p>
          </div>
          <div className="admin-topbar-actions">
            <form action="/api/admin/logout" method="post">
              <button className="ghost-button" type="submit">
                退出登录
              </button>
            </form>
          </div>
        </header>

        {ok ? <div className="message admin-feedback">{ok}</div> : null}
        {error ? <div className="message error admin-feedback">{error}</div> : null}

        {section === "overview" ? (
        <section className="section admin-section admin-overview">
        <div className="section-heading">
          <span className="eyebrow">STATUS</span>
          <h2>状态总览</h2>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{dashboard.counts.unregistered}</strong>未入库
          </div>
          <div className="stat">
            <strong>{dashboard.counts.pending_review}</strong>待复核
          </div>
          <div className="stat">
            <strong>{dashboard.counts.in_stock}</strong>库内明细
          </div>
          <div className="stat">
            <strong>{dashboard.counts.out_stock}</strong>出库明细
          </div>
        </div>
      </section>
        ) : null}

        {section === "home" ? <AdminHomepageContent initialData={homepageData} /> : null}

        {section === "accounts" ? (
        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">ACCOUNTS</span>
          <h2>账号管理</h2>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{accountData.summary.total}</strong>注册账号
          </div>
          <div className="stat">
            <strong>{accountData.summary.enabled}</strong>启用账号
          </div>
          <div className="stat">
            <strong>{accountData.summary.disabled}</strong>停用账号
          </div>
          <div className="stat">
            <strong>{accountData.summary.image2_allowed}</strong>图片权限
          </div>
        </div>
        <form className="form" action="/admin" method="get">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="account-keyword">关键词</label>
              <input id="account-keyword" name="keyword" defaultValue={accountFilters.keyword} placeholder="账号、姓名、电话、邮箱" />
            </div>
            <div className="field">
              <label htmlFor="account-member-status">身份</label>
              <select id="account-member-status" name="member_status" defaultValue={accountFilters.member_status}>
                <OptionList options={memberStatusOptions} />
              </select>
            </div>
            <div className="field">
              <label htmlFor="account-department">部门</label>
              <select id="account-department" name="department" defaultValue={accountFilters.department}>
                <OptionList options={departmentOptions} />
              </select>
            </div>
            <div className="field">
              <label htmlFor="account-state">状态</label>
              <select id="account-state" name="state" defaultValue={accountFilters.state || "all"}>
                <option value="all">全部</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="account-image2">图片权限</label>
              <select id="account-image2" name="image2" defaultValue={accountFilters.image2 || "all"}>
                <option value="all">全部</option>
                <option value="allowed">已添加</option>
                <option value="denied">未添加</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              筛选
            </button>
            <Link className="ghost-button" href="/admin">
              清空
            </Link>
          </div>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>资料</th>
                <th>状态</th>
                <th>图片工具</th>
                <th>后台备注</th>
                <th>密码</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accountData.accounts.map((account) => {
                const editFormId = `account-edit-${encodeURIComponent(account.account)}`;
                return (
                  <tr key={account.account}>
                    <td>
                      <strong>{text(account.account)}</strong>
                      <div>{formatDateTime(account.created_at)}</div>
                      <div>{formatDateTime(account.last_login_at)}</div>
                      <form id={editFormId} action={`/api/admin/site-accounts/${encodeURIComponent(account.account)}`} method="post" />
                    </td>
                    <td>
                      <div className="form-grid">
                        <div className="field">
                          <label htmlFor={`${account.account}-full-name`}>姓名</label>
                          <input form={editFormId} id={`${account.account}-full-name`} name="full_name" defaultValue={account.full_name} />
                        </div>
                        <div className="field">
                          <label htmlFor={`${account.account}-gender`}>性别</label>
                          <select form={editFormId} id={`${account.account}-gender`} name="gender" defaultValue={account.gender}>
                            <OptionList options={genderOptions} />
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`${account.account}-grade`}>年级</label>
                          <select form={editFormId} id={`${account.account}-grade`} name="grade" defaultValue={account.grade}>
                            <OptionList options={gradeOptions} />
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`${account.account}-member-status`}>身份</label>
                          <select form={editFormId} id={`${account.account}-member-status`} name="member_status" defaultValue={account.member_status}>
                            <OptionList options={memberStatusOptions} />
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`${account.account}-department`}>部门</label>
                          <select form={editFormId} id={`${account.account}-department`} name="department" defaultValue={account.department}>
                            <OptionList options={departmentOptions} />
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`${account.account}-phone`}>电话</label>
                          <input form={editFormId} id={`${account.account}-phone`} name="phone" defaultValue={account.phone} />
                        </div>
                        <div className="field">
                          <label htmlFor={`${account.account}-email`}>邮箱</label>
                          <input form={editFormId} id={`${account.account}-email`} name="email" defaultValue={account.email} />
                        </div>
                      </div>
                      <input form={editFormId} name="bio" type="hidden" value={account.bio} />
                      <input form={editFormId} name="reward_score" type="hidden" value={account.reward_score} />
                    </td>
                    <td>
                      <label className="account-switch">
                        <input form={editFormId} name="is_disabled" type="checkbox" defaultChecked={account.is_disabled} value="true" />
                        停用
                      </label>
                    </td>
                    <td>
                      <label className="account-switch">
                        <input form={editFormId} name="image2_allowed" type="checkbox" defaultChecked={account.image2_allowed} value="true" />
                        已添加
                      </label>
                    </td>
                    <td>
                      <textarea form={editFormId} name="admin_note" defaultValue={account.admin_note ?? ""} rows={3} />
                    </td>
                    <td>
                      <form action={`/api/admin/site-accounts/${encodeURIComponent(account.account)}/reset-password`} method="post">
                        <input name="new_password" type="password" minLength={6} maxLength={72} placeholder="新密码" />
                        <button className="ghost-button" type="submit">
                          重置
                        </button>
                      </form>
                    </td>
                    <td>
                      <input form={editFormId} name="intent" type="hidden" value="save" />
                      <button className="ghost-button" form={editFormId} type="submit">
                        保存
                      </button>
                      <form action={`/api/admin/site-accounts/${encodeURIComponent(account.account)}`} method="post">
                        <input name="intent" type="hidden" value="delete" />
                        <button className="ghost-button" type="submit">
                          删除
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {accountData.accounts.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    当前没有匹配账号
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
        ) : null}

        {section === "rewards" ? (
        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">REWARDS</span>
          <h2>奖励分管理</h2>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{accountData.accounts.filter(rewardSupported).length}</strong>可管理账号
          </div>
          <div className="stat">
            <strong>{accountData.accounts.reduce((total, account) => total + (rewardSupported(account) ? account.reward_score : 0), 0)}</strong>奖励分总计
          </div>
        </div>
        <form className="form" action="/admin/rewards" method="get">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="reward-keyword">关键词</label>
              <input id="reward-keyword" name="keyword" defaultValue={accountFilters.keyword} placeholder="账号、姓名、电话、邮箱" />
            </div>
            <div className="field">
              <label htmlFor="reward-member-status">身份</label>
              <select id="reward-member-status" name="member_status" defaultValue={accountFilters.member_status}>
                <option value="">全部</option>
                <option value="正式队员">正式队员</option>
                <option value="老队员">老队员</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="reward-department">部门</label>
              <select id="reward-department" name="department" defaultValue={accountFilters.department}>
                <OptionList options={departmentOptions} />
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              筛选
            </button>
            <Link className="ghost-button" href="/admin/rewards">
              清空
            </Link>
          </div>
        </form>
        <div className="table-wrap">
          <table className="admin-reward-table">
            <thead>
              <tr>
                <th>账号</th>
                <th>姓名</th>
                <th>身份</th>
                <th>部门</th>
                <th>奖励分</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accountData.accounts.filter(rewardSupported).map((account) => {
                const rewardFormId = `reward-edit-${encodeURIComponent(account.account)}`;
                return (
                  <tr key={account.account}>
                    <td>
                      <strong>{text(account.account)}</strong>
                      <div>{formatDateTime(account.updated_at)}</div>
                      <form id={rewardFormId} action={`/api/admin/site-accounts/${encodeURIComponent(account.account)}/reward-score`} method="post" />
                    </td>
                    <td>{text(account.full_name)}</td>
                    <td><span className="badge">{account.member_status}</span></td>
                    <td>{text(account.department)}</td>
                    <td>
                      <input
                        className="reward-score-input"
                        form={rewardFormId}
                        min={0}
                        max={999999}
                        name="reward_score"
                        type="number"
                        defaultValue={account.reward_score}
                      />
                    </td>
                    <td>
                      <button className="ghost-button" form={rewardFormId} type="submit">
                        保存
                      </button>
                    </td>
                  </tr>
                );
              })}
              {accountData.accounts.filter(rewardSupported).length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    当前没有可管理奖励分的账号
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
        ) : null}

        {section === "forum" ? (
        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">FORUM</span>
          <h2>论坛管理</h2>
        </div>
        <div className="table-wrap">
          <table className="admin-forum-table">
            <thead>
              <tr>
                <th>帖子</th>
                <th>作者</th>
                <th>状态</th>
                <th>回复</th>
                <th>处理说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {forumData.posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.title}</strong>
                    <p>{post.content}</p>
                    <div>{formatDateTime(post.created_at)}</div>
                    <div>
                      {post.is_pinned ? "已置顶" : "未置顶"} / {post.is_locked ? "已锁定" : "可回复"}
                    </div>
                  </td>
                  <td>{post.author_name}</td>
                  <td>
                    <span className="badge">{forumStatusText(post.status)}</span>
                    {post.deleted_at ? <div>已删除：{formatDateTime(post.deleted_at)}</div> : null}
                  </td>
                  <td>{post.reply_count}</td>
                  <td>{text(post.reject_reason)}</td>
                  <td>
                    <div className="row-actions">
                      <form action={`/api/admin/forum/posts/${encodeURIComponent(post.id)}`} method="post">
                        <input name="status" type="hidden" value="approved" />
                        <button className="ghost-button" type="submit">
                          通过
                        </button>
                      </form>
                      <form action={`/api/admin/forum/posts/${encodeURIComponent(post.id)}`} method="post">
                        <input name="status" type="hidden" value="rejected" />
                        <input name="reject_reason" placeholder="驳回原因" maxLength={500} />
                        <button className="ghost-button" type="submit">
                          驳回
                        </button>
                      </form>
                      <form action={`/api/admin/forum/posts/${encodeURIComponent(post.id)}`} method="post">
                        <input name="status" type="hidden" value="hidden" />
                        <button className="ghost-button" type="submit">
                          隐藏
                        </button>
                      </form>
                      <form action={`/api/admin/forum/posts/${encodeURIComponent(post.id)}`} method="post">
                        <input name="status" type="hidden" value={post.status} />
                        <input name="is_pinned" type="hidden" value={post.is_pinned ? "false" : "true"} />
                        <button className="ghost-button" type="submit">
                          {post.is_pinned ? "取消置顶" : "置顶"}
                        </button>
                      </form>
                      <form action={`/api/admin/forum/posts/${encodeURIComponent(post.id)}`} method="post">
                        <input name="status" type="hidden" value={post.status} />
                        <input name="is_locked" type="hidden" value={post.is_locked ? "false" : "true"} />
                        <button className="ghost-button" type="submit">
                          {post.is_locked ? "解锁" : "锁定"}
                        </button>
                      </form>
                      <form action={`/api/admin/forum/posts/${encodeURIComponent(post.id)}`} method="post">
                        <input name="intent" type="hidden" value="delete" />
                        <button className="ghost-button" type="submit">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {forumData.posts.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    当前没有论坛帖子
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="section-heading">
          <span className="eyebrow">REPLIES</span>
          <h2>回复审核</h2>
        </div>
        <div className="table-wrap">
          <table className="admin-forum-reply-table">
            <thead>
              <tr>
                <th>所属帖子</th>
                <th>回复</th>
                <th>作者</th>
                <th>状态</th>
                <th>处理说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {forumData.replies.map((reply) => (
                <tr key={reply.id}>
                  <td>{reply.post_title}</td>
                  <td>
                    <p>{reply.content}</p>
                    <div>{formatDateTime(reply.created_at)}</div>
                  </td>
                  <td>{reply.author_name}</td>
                  <td>
                    <span className="badge">{forumStatusText(reply.status)}</span>
                    {reply.deleted_at ? <div>已删除：{formatDateTime(reply.deleted_at)}</div> : null}
                  </td>
                  <td>{text(reply.reject_reason)}</td>
                  <td>
                    <div className="row-actions">
                      <form action={`/api/admin/forum/replies/${encodeURIComponent(reply.id)}`} method="post">
                        <input name="status" type="hidden" value="approved" />
                        <button className="ghost-button" type="submit">
                          通过
                        </button>
                      </form>
                      <form action={`/api/admin/forum/replies/${encodeURIComponent(reply.id)}`} method="post">
                        <input name="status" type="hidden" value="rejected" />
                        <input name="reject_reason" placeholder="驳回原因" maxLength={500} />
                        <button className="ghost-button" type="submit">
                          驳回
                        </button>
                      </form>
                      <form action={`/api/admin/forum/replies/${encodeURIComponent(reply.id)}`} method="post">
                        <input name="status" type="hidden" value="hidden" />
                        <button className="ghost-button" type="submit">
                          隐藏
                        </button>
                      </form>
                      <form action={`/api/admin/forum/replies/${encodeURIComponent(reply.id)}`} method="post">
                        <input name="intent" type="hidden" value="delete" />
                        <button className="ghost-button" type="submit">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {forumData.replies.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    当前没有论坛回复
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
        ) : null}

        {section === "materials" ? (
        <>
        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">BATCHES</span>
          <h2>待入库批次</h2>
          <form action="/api/admin/review/run" method="post">
            <input name="return_to" type="hidden" value={currentPath} />
            <button className="button" type="submit">
              执行本地审核扫描
            </button>
          </form>
        </div>
        <div className="table-wrap">
          <table className="admin-batch-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>团队</th>
                <th>提交人</th>
                <th>提交时间</th>
                <th>待确认</th>
                <th>已确认</th>
                <th>已驳回</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.pending_batches.map((batch) => (
                <tr key={String(batch.id)}>
                  <td>{text(batch.id)}</td>
                  <td>{text(batch.team_name)}</td>
                  <td>{text(batch.submitter_name)}</td>
                  <td>{formatDateTime(batch.submitted_at)}</td>
                  <td>{text(batch.pending_rows ?? 0)}</td>
                  <td>{text(batch.confirmed_rows ?? 0)}</td>
                  <td>{text(batch.rejected_rows ?? 0)}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="ghost-button" href={`/admin/batches/${encodeURIComponent(String(batch.id))}`}>
                        查看明细
                      </Link>
                      <form action={`/api/admin/batches/${String(batch.id)}/confirm-all`} method="post">
                        <button className="ghost-button" type="submit">
                          整批确认
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {dashboard.pending_batches.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={8}>
                    当前没有待入库批次
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">STOCK</span>
          <h2>库内明细</h2>
        </div>
        <div className="table-wrap">
          <table className="admin-stock-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>采购日期</th>
                <th>物资</th>
                <th>数量</th>
                <th>金额</th>
                <th>发票号码</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.in_stock_rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>{text(row.batch_id)}</td>
                  <td>{text(row.purchase_date)}</td>
                  <td>{text(row.item_name)}</td>
                  <td>{text(row.quantity)}</td>
                  <td>{text(row.amount)}</td>
                  <td>{text(row.invoice_number)}</td>
                  <td>
                    <form action={`/api/admin/reimburse/${String(row.id)}`} method="post">
                      <button className="ghost-button" type="submit">
                        提取出库
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {dashboard.in_stock_rows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    当前没有库内明细
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">REIMBURSEMENT</span>
          <h2>最近报销批次</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>批次</th>
                <th>记录数</th>
                <th>总金额</th>
                <th>提取时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.reimbursement_batches.map((batch) => (
                <tr key={String(batch.id)}>
                  <td>{text(batch.id)}</td>
                  <td>{text(batch.record_count)}</td>
                  <td>{text(batch.total_amount)}</td>
                  <td>{formatDateTime(batch.extracted_at)}</td>
                  <td>
                    <a className="ghost-button" href={`/api/admin/reimbursements/${String(batch.id)}`}>
                      下载报销表
                    </a>
                  </td>
                </tr>
              ))}
              {dashboard.reimbursement_batches.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    当前没有报销批次
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

        <section className="section admin-section">
        <div className="section-heading">
          <span className="eyebrow">LOGS</span>
          <h2>处理日志</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>阶段</th>
                <th>级别</th>
                <th>批次</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.logs.map((log) => (
                <tr key={String(log.id)}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{text(log.stage)}</td>
                  <td>
                    <span className="badge">{text(log.level)}</span>
                  </td>
                  <td>{text(log.batch_id)}</td>
                  <td>{text(log.message)}</td>
                </tr>
              ))}
              {dashboard.logs.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    当前没有处理日志
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </section>
        </>
        ) : null}
      </div>
    </div>
  );
}
