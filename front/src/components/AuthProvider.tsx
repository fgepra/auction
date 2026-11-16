"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMe, logout } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  /** 서버에 로그인 상태를 물어보는 중이면 false */
  ready: boolean;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  /** 입찰 등으로 지갑 잔액이 바뀌었을 때 화면의 잔액을 맞춘다. */
  setBalance: (balance: number) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * 로그인 상태는 서버가 쿠키로 기억해요. 화면을 열 때마다 "내 정보"를 물어봐서
 * 로그인되어 있으면 user 를 채웁니다. (브라우저에는 아무것도 저장하지 않아요.)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe().then((me) => {
      if (!alive) return;
      setUser(me);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback((next: User) => setUser(next), []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  const setBalance = useCallback(
    (balance: number) =>
      setUser((prev) => (prev ? { ...prev, balance } : prev)),
    [],
  );

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, setBalance }),
    [user, ready, signIn, signOut, setBalance],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
