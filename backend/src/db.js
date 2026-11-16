import mysql from "mysql2/promise";
import { config } from "./config.js";

export const pool = mysql.createPool({
  ...config.db,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  // DATETIME <-> JS Date 변환을 UTC로 고정
  timezone: "Z",
});

// 새 연결마다 세션 시간대를 UTC로 맞춰 NOW(3), 기본값 CURRENT_TIMESTAMP 가 항상 UTC가 되게 한다.
pool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/** 읽기 전용 단건 조회용 */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/** 트랜잭션 안에서 쓰는 조회 */
export async function q(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

export async function one(conn, sql, params = []) {
  const rows = await q(conn, sql, params);
  return rows[0] ?? null;
}

const RETRYABLE = new Set(["ER_LOCK_DEADLOCK"]);

/**
 * fn(conn) 을 하나의 트랜잭션으로 실행한다.
 * 데드락이 나면 처음부터 다시 시도한다. (최대 3번)
 */
export async function withTransaction(fn) {
  for (let attempt = 0; ; attempt++) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // 연결이 이미 끊겼다면 무시
      }
      if (RETRYABLE.has(err.code) && attempt < 2) continue;
      throw err;
    } finally {
      conn.release();
    }
  }
}
