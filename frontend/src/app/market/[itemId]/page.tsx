import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fleaMarketItems, getFleaMarketItem } from "@/lib/flea-market";

export function generateStaticParams() {
  return fleaMarketItems.map((item) => ({ itemId: item.id }));
}

export default async function MarketItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const item = getFleaMarketItem(itemId);

  if (!item) {
    notFound();
  }

  return (
    <div className="page flea-market-detail-page">
      <section className="flea-market-detail-hero">
        <div className="flea-market-detail-image">
          <Image src={item.imageSrc} alt={item.imageAlt} width={960} height={620} sizes="(max-width: 900px) 100vw, 54vw" priority />
        </div>
        <div className="flea-market-detail-copy">
          <span className="eyebrow">IDLE ITEM</span>
          <h1>{item.name}</h1>
          <p>{item.summary}</p>
          <div className="flea-market-tags" aria-label="物品标签">
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

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
              <dd>{item.team}</dd>
            </div>
            <div>
              <dt>存放位置</dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>当前状态</dt>
              <dd>{item.status}</dd>
            </div>
            <div>
              <dt>发布时间</dt>
              <dd>{item.postedAt}</dd>
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
    </div>
  );
}
