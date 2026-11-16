import bcrypt from "bcryptjs";
import { SIGNUP_BONUS } from "../constants.js";
import { query, q, withTransaction } from "../db.js";
import { conflict } from "../errors.js";

const BCRYPT_COST = 10;

// 없는 이메일로 로그인해도 같은 시간이 걸리게 해서, 가입 여부를 시간차로 알아내지 못하게 한다.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/** 가입하면서 환영 몽을 지급한다. 이메일/닉네임이 겹치면 409. */
export async function createUser({ email, nickname, password }) {
  const passwordHash = await hashPassword(password);
  try {
    return await withTransaction(async (conn) => {
      const result = await q(
        conn,
        `INSERT INTO users (email, nickname, password_hash, balance)
         VALUES (?, ?, ?, ?)`,
        [email, nickname, passwordHash, SIGNUP_BONUS],
      );
      await q(
        conn,
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after)
         VALUES (?, 'signup_bonus', ?, ?)`,
        [result.insertId, SIGNUP_BONUS, SIGNUP_BONUS],
      );
      return { id: result.insertId, email, nickname, balance: SIGNUP_BONUS };
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      if (/uq_users_nickname/.test(err.sqlMessage ?? "")) {
        throw conflict("이미 쓰고 있는 닉네임이에요.", "nickname_taken", {
          fields: { nickname: "이미 쓰고 있는 닉네임이에요." },
        });
      }
      throw conflict("이미 가입된 이메일이에요.", "email_taken", {
        fields: { email: "이미 가입된 이메일이에요." },
      });
    }
    throw err;
  }
}

/** 이메일·비밀번호가 맞으면 사용자 정보를, 아니면 null 을 돌려준다. */
export async function verifyLogin(email, password) {
  const rows = await query(
    "SELECT id, email, nickname, balance, password_hash FROM users WHERE email = ?",
    [email],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  return { id: user.id, email: user.email, nickname: user.nickname, balance: user.balance };
}
