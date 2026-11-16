import { Router } from "express";
import { unauthorized } from "../errors.js";
import { userDto } from "../lib/serialize.js";
import { parseLogin, parseSignup } from "../lib/validate.js";
import { clearAuthCookie, requireAuth, setAuthCookie } from "../middleware/auth.js";
import { createUser, verifyLogin } from "../services/users.js";

const router = Router();

// 회원가입: 환영 몽을 받고 바로 로그인된다.
router.post("/signup", async (req, res) => {
  const input = parseSignup(req.body);
  const user = await createUser(input);
  setAuthCookie(res, user.id);
  res.status(201).json({ user: userDto(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = parseLogin(req.body);
  const user = await verifyLogin(email, password);
  if (!user) throw unauthorized("이메일 또는 비밀번호가 맞지 않아요.");
  setAuthCookie(res, user.id);
  res.json({ user: userDto(user) });
});

// 로그아웃: 로그인 쿠키를 지운다. 이미 로그아웃된 상태여도 성공으로 본다.
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

// 지금 로그인한 사용자 (헤더의 닉네임·지갑 잔액을 새로 채울 때 쓴다)
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: userDto(req.user) });
});

export default router;
