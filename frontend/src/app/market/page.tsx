import Image from "next/image";
import Link from "next/link";
import { fleaMarketItems } from "@/lib/flea-market";

export default function MarketPage() {
  return (
    <div className="page flea-market-page">
      <section className="section-hero flea-market-hero">
        <span className="eyebrow">IDLE FLOW</span>
        <h1>跳蚤市场</h1>
        <p>队内闲置物品展示信息流，成员通过发布人联系完成物品流转。</p>
      </section>

      <section className="section flea-market-section" aria-label="闲置物品列表">
        <div className="flea-market-grid">
          {fleaMarketItems.map((item) => (
            <Link className="flea-market-card" href={`/market/${item.id}`} key={item.id}>
              <span className="flea-market-image">
                <Image src={item.imageSrc} alt={item.imageAlt} width={720} height={460} sizes="(max-width: 760px) 100vw, 30vw" />
              </span>
              <span className="flea-market-card-copy">
                <span className="badge">{item.status}</span>
                <strong>{item.name}</strong>
                <small>{item.owner}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
