"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import ItemArt from "@/components/ItemArt";

/** /logout 에 들어오면 로그아웃을 처리하고 안내 화면을 보여 준다. */
export default function LogoutView() {
  const { signOut } = useAuth();

  useEffect(() => {
    signOut();
  }, [signOut]);

  return (
    <section className="container auth-single">
      <div className="auth-card auth-center">
        <ItemArt kind="clock" size={120} />
        <div className="auth-head">
          <h1>로그아웃 되었어요</h1>
          <p>오늘도 상상 속 물건들이 기다리고 있을게요.</p>
        </div>
        <div className="auth-actions">
          <Link href="/" className="btn btn-primary">
            경매 둘러보기
          </Link>
          <Link href="/login" className="btn btn-outline">
            다시 로그인
          </Link>
        </div>
      </div>
    </section>
  );
}
