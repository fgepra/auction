import { BID_STEP } from "../constants.js";
import { one, q, withTransaction } from "../db.js";
import { conflict, forbidden, notFound } from "../errors.js";
import { minBidOf } from "../lib/serialize.js";
import { applyDelta } from "./wallet.js";

/**
 * 입찰한다. 몽은 입찰하는 순간 지갑에서 빠지고(에스크로),
 * 더 높은 입찰이 나오면 이전 입찰자에게 바로 돌아간다.
 *
 * 동시에 여러 명이 입찰해도 순서대로 처리되도록,
 *  1) 물건 행을 먼저 잠그고  2) 관련된 사용자 행을 id 순서로 잠근 뒤  3) 검사와 변경을 한다.
 */
export async function placeBid(userId, itemId, amount) {
  return withTransaction(async (conn) => {
    const item = await one(
      conn,
      `SELECT i.*, (i.ends_at <= NOW(3)) AS expired
       FROM items i WHERE i.id = ? FOR UPDATE`,
      [itemId],
    );
    if (!item) throw notFound("없는 물건이에요.");

    if (item.status !== "active" || item.expired) {
      throw conflict("이미 끝난 경매예요.", "auction_ended");
    }
    if (item.seller_id === userId) {
      throw forbidden("내가 올린 물건에는 입찰할 수 없어요.", "own_item");
    }

    const minBid = minBidOf(item);
    if (amount < minBid) {
      throw conflict(
        `${minBid.toLocaleString("ko-KR")} 몽 이상으로 입찰해 주세요.`,
        "bid_too_low",
        { minBid, currentPrice: item.current_price },
      );
    }

    const top = await one(
      conn,
      "SELECT user_id, amount FROM bids WHERE item_id = ? ORDER BY amount DESC LIMIT 1",
      [itemId],
    );

    // 지갑 잠금: 항상 id가 작은 사람부터 (서로 기다리는 데드락 방지)
    const ids = [...new Set([userId, top?.user_id].filter(Boolean))].sort((a, b) => a - b);
    const users = await q(
      conn,
      "SELECT id, balance FROM users WHERE id IN (?) ORDER BY id FOR UPDATE",
      [ids],
    );
    const me = users.find((u) => u.id === userId);
    const prev = top ? users.find((u) => u.id === top.user_id) : null;

    // 내가 이미 최고가라면 늘어난 만큼만, 아니면 전액을 낸다.
    const raisingOwnBid = top && top.user_id === userId;
    const needed = raisingOwnBid ? amount - top.amount : amount;
    if (Number(me.balance) < needed) {
      throw conflict("지갑에 있는 몽이 부족해요.", "insufficient_balance", {
        balance: Number(me.balance),
      });
    }

    if (top && !raisingOwnBid) {
      await applyDelta(conn, prev, top.amount, "bid_refund", itemId);
    }
    await applyDelta(conn, me, -needed, "bid_hold", itemId);

    await q(conn, "INSERT INTO bids (item_id, user_id, amount) VALUES (?, ?, ?)", [
      itemId,
      userId,
      amount,
    ]);
    await q(
      conn,
      "UPDATE items SET current_price = ?, bid_count = bid_count + 1 WHERE id = ?",
      [amount, itemId],
    );

    return {
      item: {
        id: String(itemId),
        currentPrice: amount,
        bidCount: item.bid_count + 1,
        minBid: amount + BID_STEP,
      },
      balance: Number(me.balance),
    };
  });
}
