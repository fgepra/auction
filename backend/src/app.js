import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config.js";
import { query } from "./db.js";
import { forbidden } from "./errors.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { loadUser } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import meRoutes from "./routes/me.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // 브라우저가 아닌 호출(curl, Postman 등)은 Origin 이 없다.
        callback(null, !origin || config.clientOrigins.includes(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // 쿠키 로그인을 쓰므로, 다른 사이트에서 온 변경 요청은 막는다.
  app.use((req, res, next) => {
    const safe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
    const origin = req.headers.origin;
    if (!safe && origin && !config.clientOrigins.includes(origin)) {
      return next(forbidden("허용되지 않은 출처예요.", "bad_origin"));
    }
    next();
  });

  app.get("/api/health", async (req, res) => {
    await query("SELECT 1");
    res.json({ ok: true });
  });

  // 비밀번호 대입 공격을 늦추기 위해 로그인/가입은 횟수를 제한한다.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isProd ? 30 : 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: { code: "rate_limited", message: "잠시 후 다시 시도해 주세요." } },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/signup", authLimiter);

  app.use(loadUser);
  app.use("/api/auth", authRoutes);
  app.use("/api/items", itemRoutes);
  app.use("/api/me", meRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
