import { ago, endsInMinutes, tookLabel, timeLeft, ymd } from "./format";
import type {
  AuctionItem,
  Bid,
  Listing,
  NewItemInput,
  Purchase,
  User,
} from "./types";

/**
 * 백엔드 주소. 프론트의 .env.local 에서 바꿀 수 있어요.
 *   NEXT_PUBLIC_API_URL=http://localhost:4000/api
 */
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"
).replace(/\/$/, "");

export type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

const NETWORK_ERROR =
  "서버에 연결할 수 없어요. 잠시 뒤에 다시 시도해 주세요.";

interface ApiError {
  status: number;
  code: string;
  message: string;
  minBid?: number;
}

type Raw<T> = { ok: true; status: number; data: T } | { ok: false; error: ApiError };

/** 모든 요청은 여기를 거쳐요. 쿠키 로그인을 위해 credentials: "include". */
async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Raw<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return {
      ok: false,
      error: { status: 0, code: "network", message: NETWORK_ERROR },
    };
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const e = (json as { error?: Partial<ApiError> } | null)?.error;
    return {
      ok: false,
      error: {
        status: res.status,
        code: e?.code ?? "unknown",
        message: e?.message ?? "문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.",
        minBid: e?.minBid,
      },
    };
  }
  return { ok: true, status: res.status, data: json as T };
}

function fail(error: ApiError): { ok: false; message: string } {
  return { ok: false, message: error.message };
}

/* ───────── 서버 응답 → 화면에서 쓰는 모양 ───────── */

interface ItemDto {
  id: string;
  name: string;
  tagline: string;
  maker: string;
  makerInitial: string;
  art: AuctionItem["art"];
  tint: string;
  startPrice: number;
  currentPrice: number;
  bidCount: number;
  endsAt: string;
  isNew: boolean;
  minBid?: number;
  features?: string[];
  story?: string;
  bids?: { who: string; amount: number; at: string }[];
}

function toItem(dto: ItemDto): AuctionItem {
  const bids: Bid[] = (dto.bids ?? []).map((b) => ({
    who: b.who,
    amount: b.amount,
    time: ago(b.at),
  }));
  return {
    id: dto.id,
    name: dto.name,
    tagline: dto.tagline,
    maker: dto.maker,
    makerInitial: dto.makerInitial,
    art: dto.art,
    tint: dto.tint,
    startPrice: dto.startPrice,
    currentPrice: dto.currentPrice,
    bidCount: dto.bidCount,
    minBid: dto.minBid ?? dto.currentPrice + 100,
    timeLabel: timeLeft(dto.endsAt),
    endsInMin: endsInMinutes(dto.endsAt),
    isNew: dto.isNew,
    features: dto.features ?? [],
    story: dto.story ?? "",
    bids,
  };
}

/* ───────── 로그인 ───────── */

export async function login(
  email: string,
  password: string,
): Promise<Result<{ user: User }>> {
  const res = await request<{ user: User }>("POST", "/auth/login", {
    email: email.trim(),
    password,
  });
  return res.ok ? { ok: true, user: res.data.user } : fail(res.error);
}

export async function signup(input: {
  email: string;
  password: string;
  nickname: string;
}): Promise<Result<{ user: User }>> {
  const res = await request<{ user: User }>("POST", "/auth/signup", {
    email: input.email.trim(),
    password: input.password,
    nickname: input.nickname.trim(),
  });
  return res.ok ? { ok: true, user: res.data.user } : fail(res.error);
}

export async function logout(): Promise<void> {
  await request<null>("POST", "/auth/logout", {});
}

/** 쿠키로 로그인되어 있으면 내 정보를, 아니면 null 을 돌려줘요. */
export async function getMe(): Promise<User | null> {
  const res = await request<{ user: User }>("GET", "/auth/me");
  return res.ok ? res.data.user : null;
}

/* ───────── 경매 ───────── */

export async function getItems(): Promise<AuctionItem[]> {
  const res = await request<{ items: ItemDto[] }>("GET", "/items?limit=100");
  if (!res.ok) throw new Error(res.error.message);
  return res.data.items.map(toItem);
}

/** 없는 물건이면 null */
export async function getItem(id: string): Promise<AuctionItem | null> {
  const res = await request<{ item: ItemDto }>(
    "GET",
    `/items/${encodeURIComponent(id)}`,
  );
  if (res.ok) return toItem(res.data.item);
  if (res.error.status === 404) return null;
  throw new Error(res.error.message);
}

export async function placeBid(
  itemId: string,
  amount: number,
): Promise<
  Result<{ currentPrice: number; bidCount: number; minBid: number; balance: number }>
> {
  const res = await request<{
    item: { currentPrice: number; bidCount: number; minBid: number };
    balance: number;
  }>("POST", `/items/${encodeURIComponent(itemId)}/bids`, { amount });
  if (!res.ok) return fail(res.error);
  return { ok: true, ...res.data.item, balance: res.data.balance };
}

export async function createItem(
  input: NewItemInput,
): Promise<Result<{ id: string }>> {
  const res = await request<{ id: string }>("POST", "/items", input);
  return res.ok ? { ok: true, id: res.data.id } : fail(res.error);
}

/* ───────── 마이 페이지 ───────── */

/** 로그인한 사용자가 낙찰받은 물건들 (최근 순). 로그인 안 했으면 빈 목록. */
export async function getMyPurchases(): Promise<Purchase[]> {
  const res = await request<{
    purchases: {
      id: string;
      name: string;
      maker: string;
      art: Purchase["art"];
      tint: string;
      startPrice: number;
      myBids: number[];
      wonAt: string;
      tookSec: number;
    }[];
  }>("GET", "/me/purchases");
  if (!res.ok) return [];
  return res.data.purchases.map((p) => ({
    id: p.id,
    name: p.name,
    maker: p.maker,
    art: p.art,
    tint: p.tint,
    startPrice: p.startPrice,
    myBids: p.myBids,
    wonAt: ymd(p.wonAt),
    took: tookLabel(p.tookSec),
  }));
}

/** 로그인한 사용자가 등록한 물건들 (최근 등록 순). */
export async function getMyListings(): Promise<Listing[]> {
  const res = await request<{
    listings: {
      id: string;
      name: string;
      art: Listing["art"];
      tint: string;
      startPrice: number;
      currentPrice: number;
      bidCount: number;
      status: Listing["status"];
      endsAt: string;
      winner: string | null;
      registeredAt: string;
    }[];
  }>("GET", "/me/listings");
  if (!res.ok) return [];
  return res.data.listings.map((l) => {
    const active = l.status === "active";
    return {
      id: l.id,
      name: l.name,
      art: l.art,
      tint: l.tint,
      startPrice: l.startPrice,
      currentPrice: l.currentPrice,
      bidCount: l.bidCount,
      status: l.status,
      timeLabel: active ? timeLeft(l.endsAt) : ymd(l.endsAt),
      endsInMin: active ? endsInMinutes(l.endsAt) : undefined,
      winner: l.winner ?? undefined,
      registeredAt: ymd(l.registeredAt),
    };
  });
}
