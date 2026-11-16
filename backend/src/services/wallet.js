import { q } from "../db.js";

/**
 * 몽을 더하거나 뺀다. (+면 들어옴, -면 나감)
 * 반드시 트랜잭션 안에서, 그 사용자의 행을 SELECT ... FOR UPDATE 로 잠근 뒤에 불러야 한다.
 * user 는 { id, balance } 이고, 변경된 잔액이 user.balance 에도 반영된다.
 */
export async function applyDelta(conn, user, delta, type, itemId = null) {
  const next = Number(user.balance) + delta;
  if (next < 0) {
    throw new Error(`잔액이 음수가 될 수 없어요. (user ${user.id}, ${user.balance} ${delta})`);
  }
  await q(conn, "UPDATE users SET balance = ? WHERE id = ?", [next, user.id]);
  await q(
    conn,
    `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, item_id)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, type, delta, next, itemId],
  );
  user.balance = next;
  return next;
}
