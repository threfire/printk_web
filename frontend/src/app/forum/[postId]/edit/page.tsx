import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE, type ForumPostDetailData } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";

type ForumPostEditPageProps = {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ForumPostEditState =
  | {
      status: "ready";
      data: ForumPostDetailData;
    }
  | {
      status: "not-found";
    }
  | {
      status: "error";
      message: string;
    };

async function fetchPost(postId: string, account: string): Promise<ForumPostEditState> {
  try {
    const endpoint = account
      ? `${API_BASE}/api/forum/my-posts/${encodeURIComponent(postId)}?author_account=${encodeURIComponent(account)}`
      : `${API_BASE}/api/forum/posts/${encodeURIComponent(postId)}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (response.status === 404) {
      return { status: "not-found" };
    }
    if (!response.ok) {
      return { status: "error", message: "帖子暂时无法加载，请稍后刷新重试。" };
    }
    return {
      status: "ready",
      data: (await response.json()) as ForumPostDetailData,
    };
  } catch {
    return { status: "error", message: "论坛服务连接失败，请稍后刷新重试。" };
  }
}

export default async function ForumPostEditPage({ params, searchParams }: ForumPostEditPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const { postId } = await params;
  const [cookieStore, query] = await Promise.all([
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const postState = await fetchPost(postId, account);
  if (postState.status === "not-found") {
    notFound();
  }

  const error = firstParam(query.error);

  if (postState.status === "error") {
    return (
      <div className="page forum-page">
        <section className="section-hero forum-post-hero">
          <Link className="text-button" href={`/forum/${postId}`}>
            返回帖子
          </Link>
          <span className="eyebrow">EDIT</span>
          <h1>帖子加载失败</h1>
          <p>{postState.message}</p>
          {error ? <div className="message error">{error}</div> : null}
        </section>
      </div>
    );
  }

  const { data } = postState;
  const canEditPost = Boolean(account && account === data.post.author_account);

  return (
    <div className="page forum-page">
      <section className="section-hero forum-post-hero">
        <Link className="text-button" href={`/forum/${data.post.id}`}>
          返回帖子
        </Link>
        <span className="eyebrow">EDIT</span>
        <h1>编辑帖子</h1>
        <p>修改后会进入后台审核，通过后重新展示。</p>
        {error ? <div className="message error">{error}</div> : null}
      </section>

      <section className="section forum-edit-page">
        {canEditPost ? (
          <form className="form forum-edit-form" action={`/forum/posts/${data.post.id}`} method="post">
            <div className="field">
              <label htmlFor="forum-edit-title">标题</label>
              <input
                id="forum-edit-title"
                name="title"
                defaultValue={data.post.title}
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="forum-edit-content">内容</label>
              <textarea
                id="forum-edit-content"
                name="content"
                defaultValue={data.post.content}
                required
                rows={12}
                maxLength={5000}
              />
            </div>
            <button className="button" type="submit">
              提交审核
            </button>
          </form>
        ) : (
          <div className="message error">当前账号没有编辑这个帖子的权限。</div>
        )}
      </section>
    </div>
  );
}
