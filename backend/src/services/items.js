import { q, query, withTransaction } from "../db.js";
import { pickArt } from "../lib/art.js";
import { closeItemIfExpired } from "./closer.js";

const ORDERS = {
  all: "i.created_at DESC, i.id DESC",
  new: "i.created_at DESC, i.id DESC",
  urgent: "i.ends_at ASC, i.id ASC",
  popular: "i.bid_count DESC, i.ends_at ASC, i.id ASC",
};

export const SORTS = Object.keys(ORDERS);

/** 지금 경매 중인 물건 목록 (홈 화면) */
export async function listActiveItems({ sort = "all", limit = 50, offset = 0 } = {}) {
  const order = ORDERS[sort] ?? ORDERS.all; // 화이트리스트에 있는 값만 쿼리에 넣는다.
  return query(
    `SELECT i.*, u.nickname AS seller_nickname
     FROM items i
     JOIN users u ON u.id = i.seller_id
     WHERE i.status = 'active' AND i.ends_at > NOW(3)
     ORDER BY ${order}
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

async function fetchDetail(itemId) {
  const rows = await query(
    `SELECT i.*, s.nickname AS seller_nickname, w.nickname AS winner_nickname
     FROM items i
     JOIN users s ON s.id = i.seller_id
     LEFT JOIN users w ON w.id = i.winner_id
     WHERE i.id = ?`,
    [itemId],
  );
  return rows[0] ?? null;
}

/** 상세 화면용. 마감 시각이 지났는데 아직 정리되지 않았다면 먼저 정리한다. */
export async function getItemDetail(itemId) {
  let item = await fetchDetail(itemId);
  if (!item) return null;

  if (item.status === "active" && new Date(item.ends_at) <= new Date()) {
    if (await closeItemIfExpired(itemId)) item = await fetchDetail(itemId);
  }

  const bids = await query(
    `SELECT b.amount, b.created_at, u.nickname
     FROM bids b
     JOIN users u ON u.id = b.user_id
     WHERE b.item_id = ?
     ORDER BY b.id DESC
     LIMIT 20`,
    [itemId],
  );
  return { item, bids };
}

/** 물건을 등록한다. 마감은 지금부터 days일 뒤. */
export async function createItem(user, input) {
  const art = input.art ?? pickArt(input.name);
  const endsAt = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);

  return withTransaction(async (conn) => {
    const result = await q(
      conn,
      `INSERT INTO items
         (seller_id, name, tagline, features, story, art, start_price, current_price, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        input.name,
        input.tagline,
        JSON.stringify(input.features),
        input.story,
        art,
        input.startPrice,
        input.startPrice,
        endsAt,
      ],
    );
    return { id: result.insertId };
  });
}
