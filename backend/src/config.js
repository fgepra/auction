import dotenv from "dotenv";

dotenv.config({ quiet: true });

const isProd = process.env.NODE_ENV === "production";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경변수 ${name}가 없어요. .env.example을 .env로 복사해 값을 채워 주세요.`,
    );
  }
  return value;
}

const sameSite = (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase();

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === "1",
  closerIntervalMs: Number(process.env.CLOSER_INTERVAL_MS ?? 5000),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookie: {
    name: "auction_token",
    sameSite,
    // SameSite=None 은 Secure 가 반드시 필요하다.
    secure: isProd || process.env.COOKIE_SECURE === "true" || sameSite === "none",
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "imagination_auction",
  },
  /** 서버를 띄울 때만 필요하므로 읽는 시점에 검사한다. (DB 스크립트는 없어도 됨) */
  get jwtSecret() {
    const secret = required("JWT_SECRET");
    if (isProd && secret.length < 32) {
      throw new Error("운영 환경에서는 JWT_SECRET을 32자 이상으로 정해 주세요.");
    }
    return secret;
  },
};
