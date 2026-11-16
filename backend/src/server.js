import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { startCloser } from "./services/closer.js";

// 비밀 키가 빠져 있으면 서버를 띄우기 전에 알려 준다.
void config.jwtSecret;

const app = createApp();
const stopCloser = startCloser();

const server = app.listen(config.port, () => {
  console.log(`상상 경매 백엔드가 http://localhost:${config.port} 에서 실행 중이에요.`);
});

async function shutdown() {
  console.log("서버를 종료하는 중…");
  stopCloser();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
