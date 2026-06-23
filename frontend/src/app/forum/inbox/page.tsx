import { cookies } from "next/headers";
import Link from "next/link";
import { API_BASE, type ForumInboxData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type ForumInboxPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ForumInboxState = {
  data: ForumInboxData;
  loadError: string;
};

const statusText = {
  pending: "待审核",
  rejected: "已驳回",
  approved: "已通过",
  hidden: "已隐藏",
} as const;

async function fetchInbox(account: string): Promise<ForumInboxState> {
  if (!account) {
    return {
      data: { posts: [], replies: [] },
      loadError: "",
    };
  }
  try {
    const response = await fetch(
      `${API_BASE}/api/forum/inbox?author_account=${encodeURIComponent(account)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return {
        data: { posts: [], replies: [] },
        loadError: "审核收件箱暂时不可用，请稍后刷新重试。",
      };
    }
    return {
      data: (await response.json()) as ForumInboxData,
      loadError: "",
    };
  } catch {
    return {
      data: { posts: [], replies: [] },
      loadError: "论坛服务连接失败，请稍后刷新重试。",
    };
  }
}

function formatTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function ForumInboxPage({ searchParams }: ForumInboxPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const [cookieStore, query] = await Promise.all([
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const inboxState = await fetchInbox(account);
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);
  const posts = inboxState.data.posts;
  const replies = inboxState.data.replies;
  const rejectedCount =
    posts.filter((post) => post.status === "rejected").length +
    replies.filter((reply) => reply.status === "rejected").length;
  const pendingCount =
    posts.filter((post) => post.status === "pending").length +
    replies.filter((reply) => reply.status === "pending").length;

  return (
    <div className="page forum-page">
      <section className="section forum-header">
        <div className="forum-header-copy">
          <Link className="text-button" href="/forum">
            返回论坛
          </Link>
          <h1>我的审核收件箱</h1>
          <p>查看自己提交过的待审核和已驳回帖子、回复，并从驳回记录继续编辑后重新提交。</p>
        </div>
        <div className="forum-summary" aria-label="审核收件箱概览">
          <span className="forum-summary-pill">
            <strong>{pendingCount}</strong>
            <small>待审核</small>
          </span>
          <span className="forum-summary-pill">
            <strong>{rejectedCount}</strong>
            <small>已驳回</small>
          </span>
        </div>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        {inboxState.loadError ? <div className="message error">{inboxState.loadError}</div> : null}
      </section>

      {account ? (
        <section className="section forum-inbox">
          <div className="section-heading">
            <span className="eyebrow">POSTS</span>
            <h2>帖子记录</h2>
          </div>
          {posts.length > 0 ? (
            <div className="forum-inbox-list">
              {posts.map((post) => (
                <article className="forum-inbox-item" key={post.id}>
                  <div className="forum-inbox-item-head">
                    <span className={`forum-status-badge ${post.status}`}>{statusText[post.status]}</span>
                    <strong>{post.title}</strong>
                    <span>最后更新 {formatTime(post.updated_at)}</span>
                  </div>
                  {post.reject_reason ? (
                    <div className="forum-reject-reason">驳回原因：{post.reject_reason}</div>
                  ) : null}
                  <p>{post.content}</p>
                  {post.status === "rejected" ? (
                    <Link className="button" href={`/forum/${post.id}/edit`}>
                      继续编辑
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="message">当前没有待审核或已驳回的帖子。</div>
          )}

          <div className="section-heading">
            <span className="eyebrow">REPLIES</span>
            <h2>回复记录</h2>
          </div>
          {replies.length > 0 ? (
            <div className="forum-inbox-list">
              {replies.map((reply) => (
                <article className="forum-inbox-item" key={reply.id}>
                  <div className="forum-inbox-item-head">
                    <span className={`forum-status-badge ${reply.status}`}>{statusText[reply.status]}</span>
                    <strong>{reply.post_title || "主题已不可见"}</strong>
                    <span>最后更新 {formatTime(reply.updated_at)}</span>
                  </div>
                  {reply.reject_reason ? (
                    <div className="forum-reject-reason">驳回原因：{reply.reject_reason}</div>
                  ) : null}
                  {reply.status === "rejected" ? (
                    <form className="form forum-reply-edit-form" action={`/forum/replies/${reply.id}`} method="post">
                      <div className="field">
                        <label htmlFor={`reply-${reply.id}`}>回复内容</label>
                        <textarea
                          id={`reply-${reply.id}`}
                          name="content"
                          defaultValue={reply.content}
                          required
                          rows={5}
                          maxLength={2000}
                        />
                      </div>
                      <button className="button" type="submit">
                        重新提交审核
                      </button>
                    </form>
                  ) : (
                    <p>{reply.content}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="message">当前没有待审核或已驳回的回复。</div>
          )}
        </section>
      ) : (
        <section className="section">
          <div className="message error">
            请先
            <Link className="text-button" href="/#account-login">
              登录账号
            </Link>
            后查看审核收件箱。
          </div>
        </section>
      )}
    </div>
  );
}
