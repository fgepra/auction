export const PASSWORD_MIN = 8;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** 로그인 후 돌아갈 주소. 사이트 안의 경로만 허용한다. */
export function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
