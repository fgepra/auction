import { config } from "../config.js";
import { one, q, query, withTransaction } from "../db.js";
import { applyDelta } from "./wallet.js";

/**
 * 마감 시각이 지난 경매 하나를 정리한다.
 * - 입찰이 있으면: 가장 높은 금액을 부른 사람이 낙찰, 그 금액을 판매자에게 지급
 *   (입찰자의 몽은 입찰할 때 이미 빠져 있으므로 낙찰자에게서 더 받지 않는다)
 * - 입찰이 없으면: 유찰
 * 이미 정리된 경매이거나 아직 안 끝났으면 false.
 */
export async function closeItemIfExpired(itemId) {
  return withTransaction(async (conn) => {
    const item = await one(
      conn,
      `SELECT id, seller_id FROM items
       WHERE id = ? AND status = 'active' AND ends_at <= NOW(3)
       FOR UPDATE`,
      [itemId],
    );
    if (!item) return false;

    const top = await one(
      conn,
      `SELECT user_id, amount FROM bids
       WHERE item_id = ? ORDER BY amount DESC LIMIT 1`,
      [itemId],
    );

    if (!top) {
      await q(conn, "UPDATE items SET status = 'unsold' WHERE id = ?", [itemId]);
      return true;
    }

    const seller = await one(
      conn,
      "SELECT id, balance FROM users WHERE id = ? FOR UPDATE",
      [item.seller_id],
    );
    await applyDelta(conn, seller, top.amount, "sale", itemId);
    await q(conn, "UPDATE items SET status = 'sold', winner_id = ? WHERE id = ?", [
      top.user_id,
      itemId,
    ]);
    return true;
  });
}

/** 마감된 경매를 모두 정리하고, 정리한 개수를 돌려준다. */
export async function closeExpiredAuctions() {
  const rows = await query(
    `SELECT id FROM items
     WHERE status = 'active' AND ends_at <= NOW(3)
     ORDER BY ends_at ASC LIMIT 100`,
  );
  let closed = 0;
  for (const row of rows) {
    try {
      if (await closeItemIfExpired(row.id)) closed += 1;
    } catch (err) {
      console.error(`[closer] 물건 ${row.id} 정리 실패`, err);
    }
  }
  return closed;
}

/** 일정한 간격으로 마감된 경매를 정리한다. 멈추는 함수를 돌려준다. */
export function startCloser() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await closeExpiredAuctions();
    } catch (err) {
      console.error("[closer] 오류", err);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, config.closerIntervalMs);
  tick();
  return () => clearInterval(timer);
}
