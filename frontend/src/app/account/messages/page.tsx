import Link from "next/link";
import { cookies } from "next/headers";
import { API_BASE, type SiteMessageData } from "@/lib/api";

async function markMessagesRead(account: string) {
  if (!account) return;
  try {
    await fetch(`${API_BASE}/api/site-messages/${encodeURIComponent(account)}/read`, {
      method: "PUT",
      cache: "no-store",
    });
  } catch {
    return;
  }
}

async function getMessages(account: string) {
  if (!account) return [];
  try {
    const response = await fetch(`${API_BASE}/api/site-messages/${encodeURIComponent(account)}`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as SiteMessageData;
    return data.messages;
  } catch {
    return [];
  }
}

function formatDateTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function AccountMessagesPage() {
  const cookieStore = await cookies();
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  await markMessagesRead(account);
  const messages = await getMessages(account);

  return (
    <div className="page account-messages-page">
      <section className="section-hero account-messages-hero">
        <div>
          <span className="eyebrow">MESSAGES</span>
          <h1>站内消息</h1>
          <p>查看面试申请与队内事务的处理结果。</p>
        </div>
        <Link className="ghost-button" href="/account">返回个人中心</Link>
      </section>
      {account ? (
        <section className="section">
          {messages.length ? (
            <div className="site-message-list">
              {messages.map((message) => (
                <article className="site-message-card" key={message.id}>
                  <div className="site-message-head">
                    <strong>{message.title}</strong>
                    <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
                  </div>
                  <p>{message.content}</p>
                  {message.category === "ssl_interview" ? <Link className="text-button" href="/ssl">查看 SSL 部申请</Link> : null}
                </article>
              ))}
            </div>
          ) : <div className="message">当前没有站内消息。</div>}
        </section>
      ) : (
        <section className="section">
          <div className="message error">请先登录 PRINTK 战队账号后查看站内消息。</div>
        </section>
      )}
    </div>
  );
}
