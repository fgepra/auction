"use client";

import { useMemo, useState } from "react";
import ItemCard from "@/components/ItemCard";
import type { AuctionItem } from "@/lib/types";

type Filter = "all" | "urgent" | "popular" | "new";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "urgent", label: "마감 임박" },
  { key: "popular", label: "입찰 많은 순" },
  { key: "new", label: "새로 등록" },
];

function arrange(items: AuctionItem[], filter: Filter): AuctionItem[] {
  const list = [...items];
  switch (filter) {
    case "urgent":
      return list.sort((a, b) => a.endsInMin - b.endsInMin);
    case "popular":
      return list.sort((a, b) => b.bidCount - a.bidCount);
    case "new":
      return list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    default:
      return list;
  }
}

export default function ItemGrid({ items }: { items: AuctionItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = useMemo(() => arrange(items, filter), [items, filter]);

  return (
    <section id="list" className="container list-section">
      <div className="list-head">
        <h2>지금 경매 중인 물건</h2>
        <div className="chips" role="group" aria-label="정렬">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {shown.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
