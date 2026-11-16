// 데이터베이스와 테이블을 만든다.
//   npm run db:init    : 없는 것만 만든다 (여러 번 실행해도 안전)
//   npm run db:reset   : 테이블을 모두 지우고 다시 만든다 (개발용, 데이터가 사라짐)
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

const reset = process.argv.includes("--reset");
const { database, ...connection } = config.db;

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  console.error("DB_NAME에는 영문, 숫자, 밑줄만 쓸 수 있어요.");
  process.exit(1);
}
if (reset && config.isProd) {
  console.error("운영 환경에서는 db:reset을 실행할 수 없어요.");
  process.exit(1);
}

const schema = await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8");
const conn = await mysql.createConnection({ ...connection, multipleStatements: true });

try {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conn.query(`USE \`${database}\``);

  if (reset) {
    await conn.query(
      `SET FOREIGN_KEY_CHECKS = 0;
       DROP TABLE IF EXISTS wallet_transactions, bids, items, users;
       SET FOREIGN_KEY_CHECKS = 1;`,
    );
    console.log("기존 테이블을 지웠어요.");
  }

  await conn.query(schema);
  console.log(`데이터베이스 '${database}' 준비 완료 (users, items, bids, wallet_transactions).`);
} finally {
  await conn.end();
}
