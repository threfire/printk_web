import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";
import { formatMarketTime, tagsText, type FleaMarketDetailData } from "@/lib/flea-market";
import { ENABLE_INTERACTIVE } from "@/lib/site-mode";

type MarketItemPageProps = {
  params: Promise<{ itemId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function fetchMarketItem(itemId: string, account: string) {
  const query = account ? `?viewer_account=${encodeURIComponent(account)}` : "";
  const response = await fetch(`${API_BASE}/api/market/items/${encodeURIComponent(itemId)}${query}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as FleaMarketDetailData;
}

export default async function MarketItemPage({ params, searchParams }: MarketItemPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const [{ itemId }, cookieStore, query] = await Promise.all([
    params,
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const data = await fetchMarketItem(itemId, account);
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);

  if (!data) {
    return (
      <div className="page flea-market-detail-page">
        <section className="section">
          <div className="message error">闲置物品展示服务暂时不可用，请稍后刷新重试。</div>
          <Link className="ghost-button" href="/market">
            返回闲置物品展示
          </Link>
        </section>
      </div>
    );
  }

  const item = data.item;
  const canEdit = ENABLE_INTERACTIVE && account === item.author_account;

  return (
    <div className="page flea-market-detail-page">
      <section className="flea-market-detail-hero">
        <div className="flea-market-detail-copy">
          <span className="eyebrow">IDLE ITEM</span>
          <h1>{item.name}</h1>
          <p>{item.summary}</p>
          <div className="flea-market-tags" aria-label="物品标签">
            <span>{item.status_text}</span>
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {ok ? <div className="message flea-market-feedback">{ok}</div> : null}
      {error ? <div className="message error flea-market-feedback">{error}</div> : null}

      <section className="flea-market-detail-grid" aria-label="物品详细信息">
        <article className="flea-market-detail-panel">
          <h2>详细信息</h2>
          <p>{item.detail}</p>
        </article>
        <aside className="flea-market-detail-panel">
          <h2>流转信息</h2>
          <dl className="flea-market-meta-list">
            <div>
              <dt>发布人</dt>
              <dd>{item.owner}</dd>
            </div>
            <div>
              <dt>所属组别</dt>
              <dd>{item.team || "-"}</dd>
            </div>
            <div>
              <dt>存放位置</dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>当前状态</dt>
              <dd>{item.status_text}</dd>
            </div>
            <div>
              <dt>发布时间</dt>
              <dd>{formatMarketTime(item.created_at)}</dd>
            </div>
            <div>
              <dt>联系方式</dt>
              <dd>{item.contact}</dd>
            </div>
          </dl>
          <Link className="ghost-button" href="/market">
            返回闲置物品展示
          </Link>
        </aside>
      </section>

      {canEdit ? (
        <section className="section flea-market-compose" aria-label="编辑闲置物品">
          <div>
            <span className="eyebrow">EDIT</span>
            <h2>编辑发布信息</h2>
          </div>
          <form className="form flea-market-form" action={`/market/items/${item.id}`} method="post">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="market-name">物品名称</label>
                <input id="market-name" name="name" defaultValue={item.name} required minLength={2} maxLength={60} />
              </div>
              <div className="field">
                <label htmlFor="market-location">存放位置</label>
                <input id="market-location" name="location" defaultValue={item.location} required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="market-contact">联系方式</label>
                <input id="market-contact" name="contact" defaultValue={item.contact} required maxLength={120} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="market-summary">简介</label>
              <input id="market-summary" name="summary" defaultValue={item.summary} required maxLength={180} />
            </div>
            <div className="field">
              <label htmlFor="market-detail">详细信息</label>
              <textarea id="market-detail" name="detail" defaultValue={item.detail} required rows={5} maxLength={2000} />
            </div>
            <div className="field">
              <label htmlFor="market-tags">标签</label>
              <input id="market-tags" name="tags" defaultValue={tagsText(item.tags)} maxLength={120} />
            </div>
            <div className="flea-market-actions">
              <button className="button" type="submit">
                保存信息
              </button>
              {item.status !== "sold" ? (
                <button className="ghost-button" type="submit" name="intent" value="sold">
                  标记已出
                </button>
              ) : null}
              {item.status === "delisted" ? (
                <button className="ghost-button" type="submit" name="intent" value="relist">
                  重新上架
                </button>
              ) : (
                <button className="ghost-button" type="submit" name="intent" value="delist">
                  下架
                </button>
              )}
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
