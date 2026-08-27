import { cookies } from "next/headers";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { firstParam } from "@/lib/admin-feedback";
import { formatMarketTime, type FleaMarketListData } from "@/lib/flea-market";
import { ENABLE_INTERACTIVE } from "@/lib/site-mode";

type MarketPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type MarketListState = {
  data: FleaMarketListData;
  loadError: string;
};

async function fetchMarketItems(path: string, errorMessage: string): Promise<MarketListState> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return {
        data: { items: [] },
        loadError: errorMessage,
      };
    }
    return {
      data: (await response.json()) as FleaMarketListData,
      loadError: "",
    };
  } catch {
    return {
      data: { items: [] },
      loadError: "闲置物品展示服务连接失败，请稍后刷新重试。",
    };
  }
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const emptyQuery: Record<string, string | string[] | undefined> = {};
  const [cookieStore, query] = await Promise.all([
    cookies(),
    searchParams ?? Promise.resolve(emptyQuery),
  ]);
  const account = cookieStore.get("printk-site-account")?.value ?? "";
  const publicState = await fetchMarketItems("/api/market/items", "闲置物品展示列表暂时不可用，请稍后刷新重试。");
  const mineState = account
    ? await fetchMarketItems(
        `/api/market/items?author_account=${encodeURIComponent(account)}&include_delisted=true`,
        "我的发布暂时不可用，请稍后刷新重试。",
      )
    : { data: { items: [] }, loadError: "" };
  const ok = firstParam(query.ok);
  const error = firstParam(query.error);
  const items = publicState.data.items;
  const myItems = mineState.data.items;

  return (
    <div className="page flea-market-page">
      <section className="section-hero flea-market-hero">
        <span className="eyebrow">IDLE FLOW</span>
        <h1>闲置物品展示</h1>
        <p>队内闲置物品展示信息流，成员通过发布人联系完成物品流转。</p>
      </section>

      {ok ? <div className="message flea-market-feedback">{ok}</div> : null}
      {error ? <div className="message error flea-market-feedback">{error}</div> : null}
      {publicState.loadError ? <div className="message error flea-market-feedback">{publicState.loadError}</div> : null}
      {mineState.loadError ? <div className="message error flea-market-feedback">{mineState.loadError}</div> : null}

      <section className="section flea-market-section" aria-label="闲置物品列表">
        <div className="section-heading">
          <span className="eyebrow">ITEMS</span>
          <h2>正在流转</h2>
        </div>
        {items.length > 0 ? (
          <div className="flea-market-grid">
            {items.map((item) => (
              <Link className="flea-market-card" href={`/market/${item.id}`} key={item.id}>
                <span className="flea-market-card-copy">
                  <span className="badge">{item.status_text}</span>
                  <strong>{item.name}</strong>
                  <span className="flea-market-card-summary">{item.summary}</span>
                  <small>{item.owner}</small>
                </span>
              </Link>
            ))}
          </div>
        ) : publicState.loadError ? null : (
          <div className="message">当前还没有闲置物品，登录后可以发布第一件。</div>
        )}
      </section>

      {ENABLE_INTERACTIVE && account ? (
        <section className="section flea-market-section" aria-label="我的发布">
          <div className="section-heading">
            <span className="eyebrow">MINE</span>
            <h2>我的发布</h2>
          </div>
          {myItems.length > 0 ? (
            <div className="flea-market-manage-list">
              {myItems.map((item) => (
                <article className="flea-market-manage-item" key={item.id}>
                  <div>
                    <span className="badge">{item.status_text}</span>
                    <strong>{item.name}</strong>
                    <small>最后更新 {formatMarketTime(item.updated_at)}</small>
                  </div>
                  <div className="flea-market-actions">
                    <Link className="ghost-button" href={`/market/${item.id}`}>
                      查看编辑
                    </Link>
                    {item.status !== "sold" ? (
                      <form action={`/market/items/${item.id}`} method="post">
                        <input type="hidden" name="intent" value="sold" />
                        <button className="ghost-button" type="submit">
                          标记已出
                        </button>
                      </form>
                    ) : null}
                    {item.status === "delisted" ? (
                      <form action={`/market/items/${item.id}`} method="post">
                        <input type="hidden" name="intent" value="relist" />
                        <button className="ghost-button" type="submit">
                          重新上架
                        </button>
                      </form>
                    ) : (
                      <form action={`/market/items/${item.id}`} method="post">
                        <input type="hidden" name="intent" value="delist" />
                        <button className="ghost-button" type="submit">
                          下架
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="message">当前还没有发布记录。</div>
          )}
        </section>
      ) : null}

      {ENABLE_INTERACTIVE ? (
        <>
          <a className="market-publish-fab" href="#market-publish" aria-label="发布闲置物品" title="发布闲置物品">＋</a>
          <div className="market-publish-modal" id="market-publish" role="dialog" aria-modal="true" aria-labelledby="market-publish-title">
            <Link className="market-publish-dismiss" href="/market" aria-label="关闭发布窗口" />
            <section className="market-publish-dialog">
              <div className="account-modal-heading">
                <div>
                  <span className="eyebrow">PUBLISH</span>
                  <h2 id="market-publish-title">发布闲置物品</h2>
                </div>
                <Link className="account-modal-close" href="/market" aria-label="关闭发布窗口">×</Link>
              </div>
              {account ? (
                <form className="form flea-market-form" action="/market/items" method="post">
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="market-name">物品名称</label>
                      <input id="market-name" name="name" required minLength={2} maxLength={60} />
                    </div>
                    <div className="field">
                      <label htmlFor="market-location">存放位置</label>
                      <input id="market-location" name="location" required maxLength={120} />
                    </div>
                    <div className="field">
                      <label htmlFor="market-contact">联系方式</label>
                      <input id="market-contact" name="contact" required maxLength={120} />
                    </div>
                    <div className="field">
                      <label htmlFor="market-tags">标签</label>
                      <input id="market-tags" name="tags" placeholder="底盘，调试，结构件" maxLength={120} />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="market-summary">简介</label>
                    <input id="market-summary" name="summary" required maxLength={180} />
                  </div>
                  <div className="field">
                    <label htmlFor="market-detail">详细信息</label>
                    <textarea id="market-detail" name="detail" required rows={5} maxLength={2000} />
                  </div>
                  <button className="button" type="submit">发布物品</button>
                </form>
              ) : (
                <div className="message error">
                  请先<Link className="text-button" href="/#account-login">登录账号</Link>后发布闲置物品。
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
