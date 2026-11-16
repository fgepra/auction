"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AuthAside from "@/components/AuthAside";
import { useAuth } from "@/components/AuthProvider";
import PasswordField from "@/components/PasswordField";
import { login } from "@/lib/api";
import { isEmail, safeNext } from "@/lib/auth";

interface Errors {
  email?: string;
  password?: string;
  form?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { user, ready, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // 로그인되면(방금 했거나, 이미 되어 있었거나) 원래 가려던 곳으로 보낸다.
  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Errors = {};
    if (!email.trim()) found.email = "이메일을 적어 주세요.";
    else if (!isEmail(email)) found.email = "이메일 형식이 맞는지 확인해 주세요.";
    if (!password) found.password = "비밀번호를 적어 주세요.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const result = await login(email, password);
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
        title="다시 만나서 반가워요"
        body="로그인하면 내 지갑의 몽으로 입찰하고, 상상 속 물건을 직접 경매에 올릴 수 있어요."
      />

      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-head">
          <h1>로그인</h1>
          <p>이메일과 비밀번호를 적어 주세요.</p>
        </div>

        <div className="field">
          <label htmlFor="login-email">이메일</label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-err" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <div id="login-email-err" className="field-error">
              {errors.email}
            </div>
          )}
        </div>

        <PasswordField
          id="login-password"
          label="비밀번호"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={setPassword}
        />

        <div aria-live="polite">
          {errors.form && <div className="notice notice-err">{errors.form}</div>}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting}
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>

        <div className="auth-switch">
          아직 계정이 없나요?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>회원가입</Link>
        </div>
      </form>
    </section>
  );
}
