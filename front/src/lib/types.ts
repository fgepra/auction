export type ArtKind =
  | "clock"
  | "umbrella"
  | "jar"
  | "key"
  | "shoe"
  | "cloud"
  | "book"
  | "lamp";

export interface Bid {
  who: string;
  amount: number;
  time: string;
}

export interface AuctionItem {
  id: string;
  name: string;
  tagline: string;
  maker: string;
  makerInitial: string;
  art: ArtKind;
  tint: string;
  startPrice: number;
  currentPrice: number;
  bidCount: number;
  /** 지금 부를 수 있는 가장 낮은 금액 (첫 입찰은 시작가, 이후는 현재가 + 100) */
  minBid: number;
  /** 화면에 보여 줄 남은 시간. 백엔드 연결 후에는 마감 시각(endsAt)으로 계산한다. */
  timeLabel: string;
  /** 마감 임박/정렬 기준으로 쓰는 남은 시간(분). */
  endsInMin: number;
  isNew?: boolean;
  features: string[];
  story: string;
  bids: Bid[];
}

/** 내가 낙찰받은(구매한) 물건 */
export interface Purchase {
  id: string;
  name: string;
  maker: string;
  art: ArtKind;
  tint: string;
  startPrice: number;
  /** 내가 부른 금액을 순서대로. 마지막 금액이 낙찰가다. */
  myBids: number[];
  wonAt: string;
  /** 첫 입찰부터 낙찰까지 걸린 시간 (화면에 보여 줄 문구) */
  took: string;
}

export type ListingStatus = "active" | "sold" | "unsold";

/** 내가 경매에 올린 물건 */
export interface Listing {
  id: string;
  name: string;
  art: ArtKind;
  tint: string;
  startPrice: number;
  /** 진행 중이면 현재가, 낙찰되었으면 낙찰가 */
  currentPrice: number;
  bidCount: number;
  status: ListingStatus;
  /** 진행 중이면 남은 시간, 끝났으면 종료일 */
  timeLabel: string;
  /** 마감까지 남은 시간(분). 진행 중일 때만 쓴다. */
  endsInMin?: number;
  /** 낙찰되었을 때의 낙찰자 닉네임 */
  winner?: string;
  registeredAt: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  /** 가상 화폐 '몽' 잔액 */
  balance: number;
}

export interface NewItemInput {
  name: string;
  tagline: string;
  features: string;
  story: string;
  startPrice: number;
  days: 1 | 3 | 7;
}
