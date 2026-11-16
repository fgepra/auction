import { BID_STEP } from "../constants.js";
import { tintOf } from "./art.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const iso = (date) => (date ? new Date(date).toISOString() : null);

/** 입찰할 수 있는 가장 낮은 금액. 첫 입찰은 시작가부터, 그 뒤로는 현재가 + 100몽. */
export function minBidOf(row) {
  return row.bid_count === 0 ? row.start_price : row.current_price + BID_STEP;
}

export function userDto(user) {
  return {
    id: String(user.id),
    email: user.email,
    nickname: user.nickname,
    balance: Number(user.balance),
  };
}

/** 목록 카드에 필요한 정보 (items + seller_nickname) */
export function itemSummaryDto(row) {
  return {
    id: String(row.id),
    name: row.name,
    tagline: row.tagline,
    maker: row.seller_nickname,
    makerInitial: [...row.seller_nickname][0] ?? "",
    art: row.art,
    tint: tintOf(row.art),
    startPrice: row.start_price,
    currentPrice: row.current_price,
    bidCount: row.bid_count,
    status: row.status,
    endsAt: iso(row.ends_at),
    isNew: Date.now() - new Date(row.created_at).getTime() < DAY_MS,
  };
}

/** 상세 화면: 요약 + 기능, 이야기, 입찰 기록 (items + seller_nickname + winner_nickname) */
export function itemDetailDto(row, bidRows) {
  let features = [];
  try {
    features = JSON.parse(row.features);
  } catch {
    features = [];
  }
  return {
    ...itemSummaryDto(row),
    features,
    story: row.story,
    minBid: minBidOf(row),
    winner: row.winner_nickname ?? null,
    registeredAt: iso(row.created_at),
    bids: bidRows.map((bid) => ({
      who: bid.nickname,
      amount: bid.amount,
      at: iso(bid.created_at),
    })),
  };
}
