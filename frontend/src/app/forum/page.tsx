import { cookies } from "next/headers";
import Link from "next/link";
import { API_BASE, type ForumPostListData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type ForumPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ForumPostsState = {
  data: ForumPostListData;
  loadError: string;
};

async function fetchPosts(): Promise<ForumPostsState> {
  try {
    const response = await fetch(`${API_BASE}/api/forum/posts`, { cache: "no-store" });
    if (!response.ok) {
      return {
        data: { posts: [] },
        loadError: "论坛数据暂时不可用，请稍后刷新重试。",
      };
    }
    return {
      data: (await response.json()) as ForumPostListData,
      loadError: "",
    };
  } catch {
    return {
      data: { posts: [] },
      loadError: "论坛服务连接失败，请稍后刷新重试。",
    };
  }
}

function formatTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const [forumState, cookieStore, query] = await Promise.all([
    fetchPosts(),
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

  return (
    <div className="page forum-page">
      <section className="section-hero forum-hero">
        <span className="eyebrow">FORUM</span>
        <h1>论坛</h1>
        <p>用于沉淀调试经验、赛季问题、物资讨论和训练复盘，提交内容经管理员审核后展示。</p>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        {forumState.loadError ? <div className="message error">{forumState.loadError}</div> : null}
      </section>

      <section className="section forum-layout">
        <div className="forum-main">
          <div className="section-heading">
            <span className="eyebrow">THREADS</span>
            <h2>最新帖子</h2>
          </div>
          {forumState.data.posts.length > 0 ? (
            <div className="forum-thread-list">
              {forumState.data.posts.map((post) => (
                <Link className="forum-thread" href={`/forum/${post.id}`} key={post.id}>
                  <span className="badge">{post.reply_count} 条回复</span>
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                  <span className="forum-meta">
                    {post.author_name} · {formatTime(post.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          ) : forumState.loadError ? (
            <div className="message error">论坛列表暂未加载成功，恢复后可继续浏览帖子。</div>
          ) : (
            <div className="message">当前还没有帖子，登录后可以发布第一条讨论。</div>
          )}
        </div>
      </section>

      <section className="section forum-compose" id="new-post">
        <div className="section-heading">
          <span className="eyebrow">POST</span>
          <h2>发布新帖</h2>
        </div>
        {account ? (
          <form className="form" action="/forum/posts" method="post">
            <div className="field">
              <label htmlFor="forum-title">标题</label>
              <input
                id="forum-title"
                name="title"
                placeholder="例如：英雄机器人底盘调试记录"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="forum-content">内容</label>
              <textarea
                id="forum-content"
                name="content"
                placeholder="写下问题、结论、复盘或协作需求"
                required
                rows={8}
                maxLength={5000}
              />
            </div>
            <button className="button" type="submit">
              提交审核
            </button>
          </form>
        ) : (
          <div className="message error">
            请先
            <Link className="text-button" href="/#account-login">
              登录账号
            </Link>
            后发布帖子。
          </div>
        )}
      </section>

      <Link className="forum-new-post-fab" href="#new-post" aria-label="发布新帖" title="发布新帖">
        +
      </Link>
    </div>
  );
}
