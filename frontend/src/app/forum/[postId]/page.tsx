import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE, type ForumPostDetailData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type ForumPostPageProps = {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ForumPostState =
  | {
      status: "ready";
      data: ForumPostDetailData;
    }
  | {
      status: "not-found";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

async function fetchPost(postId: string): Promise<ForumPostState> {
  try {
    const response = await fetch(`${API_BASE}/api/forum/posts/${encodeURIComponent(postId)}`, {
      cache: "no-store",
    });
    if (response.status === 404) {
      return {
        status: "not-found",
        message: "帖子不存在或已被删除。",
      };
    }
    if (!response.ok) {
      return {
        status: "error",
        message: "帖子暂时无法加载，请稍后刷新重试。",
      };
    }
    return {
      status: "ready",
      data: (await response.json()) as ForumPostDetailData,
    };
  } catch {
    return {
      status: "error",
      message: "论坛服务连接失败，请稍后刷新重试。",
    };
  }
}

function formatTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function ForumPostPage({ params, searchParams }: ForumPostPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const { postId } = await params;
  const [postState, cookieStore, query] = await Promise.all([
    fetchPost(postId),
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  if (postState.status === "not-found") {
    notFound();
  }

  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

  if (postState.status === "error") {
    return (
      <div className="page forum-page">
        <section className="section-hero forum-post-hero">
          <Link className="text-button" href="/forum">
            返回论坛
          </Link>
          <span className="eyebrow">THREAD</span>
          <h1>帖子加载失败</h1>
          <p>{postState.message}</p>
          {ok ? <div className="message">{ok}</div> : null}
          {error ? <div className="message error">{error}</div> : null}
        </section>
      </div>
    );
  }

  const { data } = postState;

  return (
    <div className="page forum-page">
      <section className="section-hero forum-post-hero">
        <Link className="text-button" href="/forum">
          返回论坛
        </Link>
        <span className="eyebrow">THREAD</span>
        <h1>{data.post.title}</h1>
        <p>
          {data.post.author_name} · {formatTime(data.post.created_at)} · {data.post.reply_count} 条回复
        </p>
        {ok ? <div className="message">{ok}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
      </section>

      <section className="section forum-post-layout">
        <article className="forum-post-body">
          <p>{data.post.content}</p>
        </article>

        <div className="section-heading">
          <span className="eyebrow">REPLIES</span>
          <h2>讨论回复</h2>
        </div>

        {data.replies.length > 0 ? (
          <div className="forum-reply-list">
            {data.replies.map((reply) => (
              <article className="forum-reply" key={reply.id}>
                <div className="forum-reply-heading">
                  <strong>{reply.author_name}</strong>
                  <span>{formatTime(reply.created_at)}</span>
                </div>
                <p>{reply.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="message">当前还没有回复。</div>
        )}

        <div className="forum-reply-form">
          <div className="section-heading">
            <span className="eyebrow">REPLY</span>
            <h2>添加回复</h2>
          </div>
          {account ? (
            <form className="form" action={`/forum/posts/${data.post.id}/replies`} method="post">
              <div className="field">
                <label htmlFor="forum-reply-content">回复内容</label>
                <textarea
                  id="forum-reply-content"
                  name="content"
                  placeholder="补充你的经验、问题或结论"
                  required
                  rows={5}
                  maxLength={2000}
                />
              </div>
              <button className="button" type="submit">
                发布回复
              </button>
            </form>
          ) : (
            <div className="message error">
              请先
              <Link className="text-button" href="/#account-login">
                登录账号
              </Link>
              后回复。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
