/** 1234 -> "1,234" */
export function formatMong(n: number): string {
  return n.toLocaleString("ko-KR");
}

/** 마감까지 60분 미만이면 마감 임박 */
export function isUrgent(endsInMin: number): boolean {
  return endsInMin < 60;
}

export const BID_STEP = 100;
/** 가입하면 받는 가상 화폐 */
export const SIGNUP_BONUS = 10000;

const pad = (n: number) => String(n).padStart(2, "0");

/** 마감까지 남은 분 (이미 지났으면 0) */
export function endsInMinutes(endsAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 60000));
}

/** 남은 시간 문구: "02:14:09" 또는 하루 이상이면 "1일 03:40" */
export function timeLeft(endsAt: string, now = Date.now()): string {
  const total = Math.floor((new Date(endsAt).getTime() - now) / 1000);
  if (total <= 0) return "마감";
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}일 ${pad(hours)}:${pad(minutes)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** "12분 전" 같은 상대 시간 */
export function ago(at: string, now = Date.now()): string {
  const min = Math.floor((now - new Date(at).getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  if (min < 1440) return `${Math.floor(min / 60)}시간 전`;
  return `${Math.floor(min / 1440)}일 전`;
}

/** 한국 날짜 "2026.10.12" */
export function ymd(at: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
  return parts.replaceAll("-", ".");
}

/** 걸린 시간: "1일 6시간", "3시간", "40분" */
export function tookLabel(sec: number): string {
  const min = Math.floor(sec / 60);
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
  if (hours > 0) return `${hours}시간`;
  return `${Math.max(1, min)}분`;
}
