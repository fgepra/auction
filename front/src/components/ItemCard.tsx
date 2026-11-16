import Link from "next/link";
import ItemArt from "@/components/ItemArt";
import { formatMong, isUrgent } from "@/lib/format";
import type { AuctionItem } from "@/lib/types";

export default function ItemCard({ item }: { item: AuctionItem }) {
  const urgent = isUrgent(item.endsInMin);

  return (
    <Link href={`/items/${item.id}`} className="card">
      <div className="card-art" style={{ background: item.tint }}>
        <ItemArt kind={item.art} />
        {urgent ? (
          <span className="badge badge-hot">마감 임박</span>
        ) : item.isNew ? (
          <span className="badge">새로 등록</span>
        ) : null}
      </div>
      <div className="card-body">
        <div className="card-name">{item.name}</div>
        <div className="card-maker">만든 사람 · {item.maker}</div>
        <div className="price-row">
          <div>
            <div className="price-label">현재가</div>
            <div className="price-value">{formatMong(item.currentPrice)} 몽</div>
          </div>
          <div className="price-right">
            <div className="price-label">남은 시간</div>
            <div className={urgent ? "time-value hot" : "time-value"}>
              {item.timeLabel}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
