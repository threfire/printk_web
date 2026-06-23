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

const forumSections = [
  {
    id: "debug",
    name: "调试经验",
    description: "机器人、电控、机械、视觉链路问题沉淀",
    keywords: ["调试", "机器人", "底盘", "电控", "机械", "视觉", "代码", "程序", "固件"],
  },
  {
    id: "season",
    name: "赛季问题",
    description: "规则、任务、备赛节奏和方案讨论",
    keywords: ["赛季", "规则", "比赛", "英雄", "步兵", "哨兵", "方案", "备赛"],
  },
  {
    id: "resource",
    name: "物资协作",
    description: "物资、采购、入库、报销和借用记录",
    keywords: ["物资", "采购", "入库", "发票", "报销", "借用", "库存"],
  },
  {
    id: "review",
    name: "训练复盘",
    description: "训练问题、赛后复盘和协作结论",
    keywords: ["训练", "复盘", "总结", "协作", "记录", "会议"],
  },
] as const;

type ForumSection = (typeof forumSections)[number];

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

function getForumSection(title: string, content: string): ForumSection {
  const source = `${title} ${content}`;
  return forumSections.find((section) => section.keywords.some((keyword) => source.includes(keyword))) ?? forumSections[0];
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
  const posts = forumState.data.posts;
  const totalReplies = posts.reduce((sum, post) => sum + post.reply_count, 0);
  const activeAuthors = new Set(posts.map((post) => post.author_name)).size;
  const pinnedCount = posts.filter((post) => post.is_pinned).length;

  return (
    <div className="page forum-page">
      <section className="section forum-header">
        <div className="forum-header-copy">
          <h1>论坛</h1>
          <p>围绕调试经验、赛季问题、物资协作和训练复盘组织主题，提交内容经管理员审核后展示。</p>
        </div>

        <div className="forum-header-tools">
          {account ? (
            <Link className="ghost-button" href="/forum/inbox">
              我的审核收件箱
            </Link>
          ) : null}
          <div className="forum-rule-popover">
            <button className="forum-rule-trigger" type="button" aria-label="查看发帖规则">
              发帖规则
            </button>
            <div className="forum-rule-tooltip" role="tooltip">
              <strong>发帖规则</strong>
              <span>标题写清对象、现象和结论。</span>
              <span>正文补充复现路径、处理记录和协作需求。</span>
              <span>审核通过后进入主题列表。</span>
            </div>
          </div>
        </div>

        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
        {forumState.loadError ? <div className="message error">{forumState.loadError}</div> : null}
      </section>

      <section className="section forum-layout" id="forum-topics">
        <aside className="forum-sidebar" aria-label="论坛侧边栏">
          <div className="forum-sidebar-block">
            <strong>论坛概览</strong>
            <div className="forum-summary" aria-label="论坛概览">
              <span className="forum-summary-pill">
                <strong>{posts.length}</strong>
                <small>主题</small>
              </span>
              <span className="forum-summary-pill">
                <strong>{totalReplies}</strong>
                <small>回复</small>
              </span>
              <span className="forum-summary-pill">
                <strong>{activeAuthors}</strong>
                <small>成员</small>
              </span>
              <span className="forum-summary-pill">
                <strong>{pinnedCount}</strong>
                <small>置顶</small>
              </span>
            </div>
          </div>
          <div className="forum-sidebar-block">
            <strong>主题分区</strong>
            <nav className="forum-section-nav" aria-label="论坛分区">
              {forumSections.map((section) => (
                <a href="#forum-topics" key={section.id}>
                  <span>{section.name}</span>
                  <small>{section.description}</small>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="forum-stream">
          {posts.length > 0 ? (
            <div className="forum-thread-list">
              {posts.map((post) => {
                const section = getForumSection(post.title, post.content);
                return (
                  <Link className="forum-thread" href={`/forum/${post.id}`} key={post.id}>
                    <span className="forum-avatar" aria-hidden="true">
                      {post.author_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="forum-thread-content">
                      <span className="forum-thread-kicker">
                        <span className="forum-section-pill">{section.name}</span>
                        {post.is_pinned ? <span className="badge">置顶</span> : null}
                        {post.is_locked ? <span className="badge">锁定</span> : null}
                      </span>
                      <h3>{post.title}</h3>
                      <p>{post.content}</p>
                      <span className="forum-meta">
                        {post.author_name} · {formatTime(post.created_at)}
                      </span>
                    </span>
                    <span className="forum-thread-stats">
                      <strong>{post.reply_count}</strong>
                      <small>回复</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : forumState.loadError ? (
            <div className="message error">论坛列表暂未加载成功，恢复后可继续浏览帖子。</div>
          ) : (
            <div className="message">当前还没有帖子，登录后可以发布第一条讨论。</div>
          )}
        </div>
      </section>

      <div className="forum-compose-popover" id="new-post" aria-labelledby="new-post-title">
        <a className="forum-compose-dismiss" href="#" aria-label="关闭发布窗口" />
        <section className="forum-compose-dialog">
          <div className="forum-compose-header">
            <div>
              <span className="eyebrow">POST</span>
              <h2 id="new-post-title">发布新帖</h2>
            </div>
            <a className="forum-compose-close" href="#" aria-label="关闭发布窗口">
              ×
            </a>
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
                  rows={7}
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
      </div>

      <a className="forum-new-post-fab" href="#new-post" aria-label="发布新帖" title="发布新帖">
        +
      </a>
    </div>
  );
}
