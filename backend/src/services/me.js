import { query } from "../db.js";
import { tintOf } from "../lib/art.js";
import { iso } from "../lib/serialize.js";

/** 내가 낙찰받은 물건 (마이 페이지 '낙찰 내역'). 최근 낙찰 순. */
export async function getPurchases(userId) {
  const items = await query(
    `SELECT i.id, i.name, i.art, i.start_price, i.current_price, i.ends_at,
            s.nickname AS seller_nickname
     FROM items i
     JOIN users s ON s.id = i.seller_id
     WHERE i.winner_id = ? AND i.status = 'sold'
     ORDER BY i.ends_at DESC, i.id DESC`,
    [userId],
  );
  if (items.length === 0) return [];

  const bids = await query(
    `SELECT item_id, amount, created_at FROM bids
     WHERE user_id = ? AND item_id IN (?)
     ORDER BY id ASC`,
    [userId, items.map((item) => item.id)],
  );
  const byItem = new Map();
  for (const bid of bids) {
    if (!byItem.has(bid.item_id)) byItem.set(bid.item_id, []);
    byItem.get(bid.item_id).push(bid);
  }

  return items.map((item) => {
    const mine = byItem.get(item.id) ?? [];
    const firstBidAt = mine[0]?.created_at ?? null;
    const tookSec = firstBidAt
      ? Math.max(
          0,
          Math.floor((new Date(item.ends_at) - new Date(firstBidAt)) / 1000),
        )
      : 0;
    return {
      id: String(item.id),
      name: item.name,
      maker: item.seller_nickname,
      art: item.art,
      tint: tintOf(item.art),
      startPrice: item.start_price,
      finalPrice: item.current_price,
      // 내가 부른 금액을 순서대로. 마지막 금액이 낙찰가다.
      myBids: mine.map((bid) => bid.amount),
      wonAt: iso(item.ends_at),
      firstBidAt: iso(firstBidAt),
      tookSec,
    };
  });
}

/** 내가 등록한 물건 (마이 페이지 '내가 등록한 물건'). 최근 등록 순. */
export async function getListings(userId) {
  const rows = await query(
    `SELECT i.id, i.name, i.art, i.start_price, i.current_price, i.bid_count,
            i.status, i.ends_at, i.created_at, w.nickname AS winner_nickname
     FROM items i
     LEFT JOIN users w ON w.id = i.winner_id
     WHERE i.seller_id = ?
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    art: row.art,
    tint: tintOf(row.art),
    startPrice: row.start_price,
    currentPrice: row.current_price,
    bidCount: row.bid_count,
    status: row.status,
    endsAt: iso(row.ends_at),
    winner: row.winner_nickname ?? null,
    registeredAt: iso(row.created_at),
  }));
}
