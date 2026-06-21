import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE, type ForumPostDetailData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type ForumPostPageProps = {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function fetchPost(postId: string): Promise<ForumPostDetailData | null> {
  try {
    const response = await fetch(`${API_BASE}/api/forum/posts/${encodeURIComponent(postId)}`, { cache: "no-store" });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      return null;
    }
    return response.json() as Promise<ForumPostDetailData>;
  } catch {
    return null;
  }
}

function formatTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function ForumPostPage({ params, searchParams }: ForumPostPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const { postId } = await params;
  const [data, cookieStore, query] = await Promise.all([
    fetchPost(postId),
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  if (!data) {
    notFound();
  }

  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

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
            <form className="form" action={`/api/forum/posts/${data.post.id}/replies`} method="post">
              <div className="field">
                <label htmlFor="forum-reply-content">回复内容</label>
                <textarea id="forum-reply-content" name="content" placeholder="补充你的经验、问题或结论" required rows={5} maxLength={2000} />
              </div>
              <button className="button" type="submit">
                发布回复
              </button>
            </form>
          ) : (
            <div className="message error">
              请先<Link className="text-button" href="/#account-login">登录账号</Link>后回复。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
