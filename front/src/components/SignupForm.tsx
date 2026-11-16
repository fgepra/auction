"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AuthAside from "@/components/AuthAside";
import { useAuth } from "@/components/AuthProvider";
import PasswordField from "@/components/PasswordField";
import { signup } from "@/lib/api";
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  PASSWORD_MIN,
  isEmail,
  safeNext,
} from "@/lib/auth";
import { SIGNUP_BONUS, formatMong } from "@/lib/format";

interface Errors {
  nickname?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export default function SignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { user, ready, signIn } = useAuth();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Errors = {};
    const name = nickname.trim();

    if (name.length < NICKNAME_MIN || name.length > NICKNAME_MAX) {
      found.nickname = `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 적어 주세요.`;
    }
    if (!email.trim()) found.email = "이메일을 적어 주세요.";
    else if (!isEmail(email)) found.email = "이메일 형식이 맞는지 확인해 주세요.";
    if (password.length < PASSWORD_MIN) {
      found.password = `비밀번호는 ${PASSWORD_MIN}자 이상으로 정해 주세요.`;
    }
    if (confirm !== password) found.confirm = "비밀번호가 서로 달라요.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const result = await signup({ email, password, nickname: name });
    setSubmitting(false);

    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }
    signIn(result.user);
  }

  if (ready && user) return null;

  return (
    <section className="container auth-wrap">
      <AuthAside
        title={`가입하면 ${formatMong(SIGNUP_BONUS)} 몽을 드려요`}
        body="실제 돈은 오가지 않아요. 받은 몽으로 마음에 드는 상상 속 물건에 입찰해 보세요."
      />

      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-head">
          <h1>회원가입</h1>
          <p>닉네임은 입찰 기록과 만든 사람 이름으로 보여요.</p>
        </div>

        <div className="field">
          <label htmlFor="signup-nickname">닉네임</label>
          <input
            id="signup-nickname"
            className="input"
            type="text"
            autoComplete="nickname"
            placeholder="예: 하늘다람"
            maxLength={NICKNAME_MAX}
            value={nickname}
            aria-invalid={!!errors.nickname}
            aria-describedby="signup-nickname-msg"
            onChange={(e) => setNickname(e.target.value)}
          />
          {errors.nickname ? (
            <div id="signup-nickname-msg" className="field-error">
              {errors.nickname}
            </div>
          ) : (
            <div id="signup-nickname-msg" className="hint">
              {NICKNAME_MIN}~{NICKNAME_MAX}자
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="signup-email">이메일</label>
          <input
            id="signup-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signup-email-err" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <div id="signup-email-err" className="field-error">
              {errors.email}
            </div>
          )}
        </div>

        <PasswordField
          id="signup-password"
          label="비밀번호"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          hint={`${PASSWORD_MIN}자 이상`}
          onChange={setPassword}
        />

        <PasswordField
          id="signup-confirm"
          label="비밀번호 확인"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={setConfirm}
        />

        <div aria-live="polite">
          {errors.form && <div className="notice notice-err">{errors.form}</div>}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting}
        >
          {submitting ? "가입 중…" : "가입하고 시작하기"}
        </button>

        <div className="auth-switch">
          이미 계정이 있나요?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`}>로그인</Link>
        </div>
      </form>
    </section>
  );
}
