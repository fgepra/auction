"use client";

import Link from "next/link";
import { useEffect, useState, type KeyboardEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import ItemArt from "@/components/ItemArt";
import { getMyListings, getMyPurchases } from "@/lib/api";
import { formatMong, isUrgent } from "@/lib/format";
import type { Listing, ListingStatus, Purchase } from "@/lib/types";

type Tab = "bought" | "listed";
type StatusFilter = "all" | ListingStatus;
const TABS: Tab[] = ["bought", "listed"];

const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "진행 중",
  sold: "낙찰 완료",
  unsold: "유찰",
};

function finalPrice(p: Purchase): number {
  return p.myBids[p.myBids.length - 1];
}

export default function MyPage() {
  const { user, ready } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [tab, setTab] = useState<Tab>("bought");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getMyPurchases().then((list) => {
      if (alive) setPurchases(list);
    });
    getMyListings().then((list) => {
      if (alive) setListings(list);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!ready) return null;

  if (!user) {
    return (
      <section className="container auth-single">
        <div className="auth-card gate">
          <div className="auth-head">
            <h1>로그인이 필요해요</h1>
            <p>
              마이 페이지에서는 내가 낙찰받은 물건과 내가 등록한 물건을 볼 수
              있어요.
            </p>
          </div>
          <div className="auth-actions">
            <Link
              href={`/login?next=${encodeURIComponent("/mypage")}`}
              className="btn btn-primary"
            >
              로그인
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent("/mypage")}`}
              className="btn btn-outline"
            >
              회원가입
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const count = purchases?.length ?? 0;
  const total = (purchases ?? []).reduce((sum, p) => sum + finalPrice(p), 0);
  const bidSum = (purchases ?? []).reduce((sum, p) => sum + p.myBids.length, 0);
  const average = count > 0 ? (bidSum / count).toFixed(1) : "—";

  const listed = listings ?? [];
  const activeCount = listed.filter((l) => l.status === "active").length;
  const soldCount = listed.filter((l) => l.status === "sold").length;
  const unsoldCount = listed.filter((l) => l.status === "unsold").length;
  const earned = listed
    .filter((l) => l.status === "sold")
    .reduce((sum, l) => sum + l.currentPrice, 0);

  const filters: { key: StatusFilter; label: string; n: number }[] = [
    { key: "all", label: "전체", n: listed.length },
    { key: "active", label: STATUS_LABEL.active, n: activeCount },
    { key: "sold", label: "낙찰", n: soldCount },
    { key: "unsold", label: STATUS_LABEL.unsold, n: unsoldCount },
  ];
  const shown =
    statusFilter === "all"
      ? listed
      : listed.filter((l) => l.status === statusFilter);

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tab === "bought" ? "listed" : "bought";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  const tabCount: Record<Tab, number | null> = {
    bought: purchases ? purchases.length : null,
    listed: listings ? listings.length : null,
  };
  const tabLabel: Record<Tab, string> = {
    bought: "낙찰 내역",
    listed: "내가 등록한 물건",
  };

  return (
    <>
      <section className="container page-head">
        <h1>마이 페이지</h1>
        <p>내가 낙찰받은 물건과 내가 등록한 물건을 한곳에서 볼 수 있어요.</p>
      </section>

      <section className="container me-top">
        <div className="me-profile">
          <div className="me-avatar" aria-hidden="true">
            {user.nickname.slice(0, 1)}
          </div>
          <div className="me-info">
            <div className="me-name">{user.nickname}</div>
            <div className="me-email">{user.email}</div>
            <div className="wallet me-wallet">
              내 지갑 {formatMong(user.balance)} 몽
            </div>
          </div>
        </div>

        <dl className="me-stats">
          <div className="stat">
            <dt className="stat-label">낙찰한 물건</dt>
            <dd className="stat-value">{purchases ? `${count}개` : "—"}</dd>
          </div>
          <div className="stat">
            <dt className="stat-label">쓴 몽 합계</dt>
            <dd className="stat-value">
              {purchases ? `${formatMong(total)} 몽` : "—"}
            </dd>
          </div>
          <div className="stat">
            <dt className="stat-label">평균 입찰 횟수</dt>
            <dd className="stat-value">
              {purchases && count > 0 ? `${average}번` : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="container me-section">
        <div className="tabs" role="tablist" aria-label="내 활동">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              className="tab"
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={onTabKeyDown}
            >
              {tabLabel[key]}
              {tabCount[key] !== null && (
                <span className="tab-count">{tabCount[key]}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "bought" && (
          <div id="panel-bought" role="tabpanel" aria-labelledby="tab-bought">
            {purchases === null ? (
              <div className="hint" aria-live="polite">
                불러오는 중…
              </div>
            ) : count === 0 ? (
              <div className="panel me-empty">
                <strong>아직 낙찰받은 물건이 없어요</strong>
                <p className="hint">마음에 드는 상상 속 물건에 입찰해 보세요.</p>
                <Link href="/" className="btn btn-primary">
                  경매 둘러보기
                </Link>
              </div>
            ) : (
              <ul className="buy-list">
                {purchases.map((p) => {
                  const final = finalPrice(p);
                  const ratio = (final / p.startPrice).toFixed(1);
                  return (
                    <li key={p.id} className="buy">
                      <div className="buy-art" style={{ background: p.tint }}>
                        <ItemArt kind={p.art} size={64} />
                      </div>
                       <div className="buy-main">
                        <div className="buy-name">{p.name}</div>
                        <div className="buy-meta">
                          만든 사람 · {p.maker} · {p.wonAt} 낙찰
                        </div>
                        <ol className="buy-path" aria-label="내 입찰 흐름">
                          {p.myBids.map((bid, i) => (
                            <li key={`${p.id}-${i}`}>
                              <span
                                className={
                                  i === p.myBids.length - 1
                                    ? "bid-chip final"
                                    : "bid-chip"
                                }
                              >
                                {formatMong(bid)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <dl className="buy-stats">
                        <div className="buy-stat">
                          <dt>입찰 횟수</dt>
                          <dd>
                            <b>{p.myBids.length}번째</b>
                          </dd>
                        </div>
                        <div className="buy-stat">
                          <dt>낙찰가</dt>
                          <dd>
                            <b className="price">{formatMong(final)} 몽</b>
                            <span>
                              시작가 {formatMong(p.startPrice)} 몽 · {ratio}배
                            </span>
                          </dd>
                        </div>
                        <div className="buy-stat">
                          <dt>걸린 시간</dt>
                          <dd>
                            <b>{p.took}</b>
                            <span>첫 입찰부터 낙찰까지</span>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "listed" && (
          <div id="panel-listed" role="tabpanel" aria-labelledby="tab-listed">
            {listings === null ? (
              <div className="hint" aria-live="polite">
                불러오는 중…
              </div>
            ) : listed.length === 0 ? (
              <div className="panel me-empty">
                <strong>아직 등록한 물건이 없어요</strong>
                <p className="hint">
                  있으면 좋겠다고 생각한 물건을 경매에 올려 보세요.
                </p>
                <Link href="/items/new" className="btn btn-primary">
                  내 물건 등록하기
                </Link>
              </div>
            ) : (
              <>
                <div className="me-summary">
                  <div className="chips" role="group" aria-label="상태별 보기">
                    {filters.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className="chip"
                        aria-pressed={statusFilter === f.key}
                        onClick={() => setStatusFilter(f.key)}
                      >
                        {f.label} {f.n}
                      </button>
                    ))}
                  </div>
                  <div className="sum-chip">
                    판매로 받은 몽 <b>{formatMong(earned)} 몽</b>
                  </div>
                </div>

                {shown.length === 0 ? (
                  <div className="panel me-empty" aria-live="polite">
                    <strong>
                      {statusFilter === "all"
                        ? "등록한 물건이 없어요"
                        : `${STATUS_LABEL[statusFilter]} 상태인 물건이 없어요`}
                    </strong>
                  </div>
                ) : (
                <ul className="buy-list">
                  {shown.map((l) => {
                    const isActive = l.status === "active";
                    const urgent =
                      isActive && l.endsInMin !== undefined && isUrgent(l.endsInMin);
                    const priceLabel =
                      l.status === "sold"
                        ? "낙찰가"
                        : l.status === "active"
                          ? "현재가"
                          : "시작가";
                    return (
                      <li key={l.id} className="buy">
                        <div className="buy-art" style={{ background: l.tint }}>
                          <ItemArt kind={l.art} size={64} />
                        </div>

                        <div className="buy-main">
                          <div className="buy-title-row">
                            <span className="buy-name">{l.name}</span>
                            <span className={`status status-${l.status}`}>
                              {STATUS_LABEL[l.status]}
                            </span>
                          </div>
                          <div className="buy-meta">
                            {l.registeredAt} 등록
                            {l.status === "sold" && l.winner
                              ? ` · 낙찰자 ${l.winner}`
                              : ""}
                          </div>
                        </div>

                        <dl className="buy-stats">
                          <div className="buy-stat">
                            <dt>{priceLabel}</dt>
                            <dd>
                              <b className="price">
                                {formatMong(l.currentPrice)} 몽
                              </b>
                              <span>
                                {l.status === "unsold"
                                  ? "입찰 없이 종료"
                                  : `시작가 ${formatMong(l.startPrice)} 몽`}
                              </span>
                            </dd>
                          </div>
                          <div className="buy-stat">
                            <dt>입찰</dt>
                            <dd>
                              <b>{l.bidCount}번</b>
                            </dd>
                          </div>
                          <div className="buy-stat">
                            <dt>{isActive ? "남은 시간" : "종료일"}</dt>
                            <dd>
                              <b className={urgent ? "hot" : undefined}>
                                {l.timeLabel}
                              </b>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}
