import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";
import { unauthorized } from "../errors.js";

export function signToken(userId) {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(userId),
    expiresIn: config.jwtExpiresIn,
    algorithm: "HS256",
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: "/",
  };
}

export function setAuthCookie(res, userId) {
  res.cookie(config.cookie.name, signToken(userId), {
    ...cookieOptions(),
    maxAge: config.cookie.maxAgeMs,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(config.cookie.name, cookieOptions());
}

/** 쿠키에 유효한 토큰이 있으면 req.user 에 최신 사용자 정보를 채운다. (없어도 통과) */
export async function loadUser(req, res, next) {
  const token = req.cookies?.[config.cookie.name];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    const rows = await query(
      "SELECT id, email, nickname, balance FROM users WHERE id = ?",
      [payload.sub],
    );
    req.user = rows[0] ?? null;
  } catch (err) {
    // 만료되었거나 위조된 토큰은 비로그인으로 취급한다. DB 오류는 그대로 올린다.
    if (err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError") {
      return next(err);
    }
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}
