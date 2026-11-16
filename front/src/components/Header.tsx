"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { formatMong } from "@/lib/format";

const NAV = [
  { href: "/", label: "경매 둘러보기" },
  { href: "/items/new", label: "물건 등록하기" },
  { href: "/#how", label: "이용 방법" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return (
      pathname === "/" ||
      (pathname.startsWith("/items/") && pathname !== "/items/new")
    );
  }
  if (href === "/items/new") return pathname === "/items/new";
  return false;
}

export default function Header() {
  const pathname = usePathname();
  const { user, ready } = useAuth();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <rect width="36" height="36" rx="11" fill="#5A3BF0" />
            <circle
              cx="18"
              cy="18"
              r="8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            <circle cx="26" cy="10" r="3" fill="#FFFFFF" />
          </svg>
          <span>상상 경매</span>
        </Link>

        <nav className="nav" aria-label="주요 메뉴">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href, pathname) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          {!ready ? null : user ? (
            <>
              <div className="wallet">내 지갑 {formatMong(user.balance)} 몽</div>
              <Link
                href="/mypage"
                className="avatar"
                aria-label={`${user.nickname} 마이 페이지`}
                title="마이 페이지"
              >
                {user.nickname.slice(0, 1)}
              </Link>
              <Link href="/logout" className="logout-link">
                로그아웃
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                로그인
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
