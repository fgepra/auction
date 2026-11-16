"use client";

import Link from "next/link";
import { useState } from "react";
import ItemArt from "@/components/ItemArt";
import { placeBid } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { BID_STEP, formatMong } from "@/lib/format";
import type { AuctionItem, Bid } from "@/lib/types";

export default function ItemDetail({ item }: { item: AuctionItem }) {
  const [current, setCurrent] = useState(item.currentPrice);
  const [minAmount, setMinAmount] = useState(item.minBid);
  const [amount, setAmount] = useState(item.minBid);
  const [bids, setBids] = useState<Bid[]>(item.bids);
  const [myBids, setMyBids] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { user, ready, setBalance } = useAuth();

  // 내가 이미 최고가라면, 그 금액은 묶여 있으니 늘어난 만큼만 지갑에서 빠진다.
  const myTop = user && bids[0]?.who === user.nickname ? bids[0].amount : 0;
  const overBalance = !!user && amount - myTop > user.balance;

  function change(next: number) {
    setAmount(Math.max(minAmount, next));
    setPlaced(false);
    setError(null);
  }

  async function submit() {
    if (!user || submitting || overBalance || amount < minAmount) return;
    setSubmitting(true);
    setError(null);
    const result = await placeBid(item.id, amount);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCurrent(result.currentPrice);
    setMinAmount(result.minBid);
    setAmount(result.minBid);
    setBalance(result.balance);
    setBids([{ who: user.nickname, amount, time: "방금" }, ...bids]);
    setMyBids(myBids + 1);
    setPlaced(true);
  }

  return (
    <>
      <div className="container">
        <Link href="/" className="back-link">
          ← 경매 목록으로
        </Link>
      </div>

      <section className="container detail-top">
        <div className="detail-art" style={{ background: item.tint }}>
          <ItemArt kind={item.art} size={320} strokeWidth={2.4} />
          <span className="tag">상상 속 물건</span>
        </div>

        <div className="detail-side">
          <div>
            <h1 className="detail-title">{item.name}</h1>
            <div className="maker-row">
              <div className="maker-dot">{item.makerInitial}</div>
              <span>
                만든 사람 · <b>{item.maker}</b>
              </span>
            </div>
          </div>

          <div className="panel bid-panel">
            <div className="bid-top">
              <div>
                <div className="bid-label">현재 최고가</div>
                <div className="bid-current">{formatMong(current)} 몽</div>
              </div>
              <div>
                <div className="bid-label" style={{ textAlign: "right" }}>
                  남은 시간
                </div>
                <div className="bid-time">{item.timeLabel}</div>
              </div>
            </div>
            <div className="bid-meta">
              지금까지 {item.bidCount + myBids}번 입찰 · 시작가{" "}
              {formatMong(item.startPrice)} 몽
            </div>

            <div className="bid-field">
              <div className="bid-field-title">내 입찰 금액</div>
              <div className="stepper">
                <button
                  type="button"
                  className="step-btn"
                  aria-label={`${BID_STEP} 몽 내리기`}
                  disabled={amount <= minAmount}
                  onClick={() => change(amount - BID_STEP)}
                >
                  −
                </button>
                <div className="amount" aria-live="polite">
                  {formatMong(amount)} 몽
                </div>
                <button
                  type="button"
                  className="step-btn"
                  aria-label={`${BID_STEP} 몽 올리기`}
                  onClick={() => change(amount + BID_STEP)}
                >
                  +
                </button>
              </div>
              <div className="quick">
                <button
                  type="button"
                  disabled={amount <= minAmount}
                  onClick={() => change(amount - 1000)}
                >
                  −1,000
                </button>
                <button
                  type="button"
                  disabled={amount <= minAmount}
                  onClick={() => change(amount - 500)}
                >
                  −500
                </button>
                <button type="button" onClick={() => change(amount + 500)}>
                  +500
                </button>
                <button type="button" onClick={() => change(amount + 1000)}>
                  +1,000
                </button>
              </div>
              <div className="hint">
                최소 입찰 단위 {formatMong(BID_STEP)} 몽
                {user
                  ? ` · 내 지갑 ${formatMong(user.balance)} 몽`
                  : " · 로그인하면 입찰할 수 있어요"}
              </div>
            </div>

            {ready && !user ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/items/${item.id}`)}`}
                className="bid-submit"
              >
                로그인하고 입찰하기
              </Link>
            ) : (
              <button
                type="button"
                className="bid-submit"
                disabled={!ready || submitting || overBalance}
                onClick={submit}
              >
                {submitting
                  ? "입찰 중…"
                  : `${formatMong(amount)} 몽으로 입찰하기`}
              </button>
            )}

            <div aria-live="polite">
              {overBalance && (
                <div className="notice notice-err">
                  지갑에 있는 몽보다 큰 금액이에요. 금액을 줄여 주세요.
                </div>
              )}
              {error && <div className="notice notice-err">{error}</div>}
              {placed && (
                <div className="notice notice-ok">
                  입찰했어요. 지금 내가 최고가예요.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container detail-info">
        <div className="info-left">
          <div className="panel">
            <h2>기능과 특징</h2>
            {item.features.map((feature) => (
              <div key={feature} className="feature">
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>만든 사람의 이야기</h2>
            <p className="story">{item.story}</p>
            <div className="story-by">— {item.maker}</div>
          </div>
        </div>

        <div className="panel info-right">
          <h2>입찰 기록</h2>
          <ul className="history">
            {bids.map((bid, i) => (
              <li key={`${bid.who}-${bid.amount}-${i}`}>
                <div>
                  <div className="history-who">{bid.who}</div>
                  <div className="history-time">{bid.time}</div>
                </div>
                <div className="history-amount">
                  {i === 0 && <span className="top-tag">최고가</span>}
                  <span>{formatMong(bid.amount)} 몽</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
