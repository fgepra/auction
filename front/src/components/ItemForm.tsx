"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import ItemArt from "@/components/ItemArt";
import { useAuth } from "@/components/AuthProvider";
import { createItem } from "@/lib/api";
import { BID_STEP, formatMong } from "@/lib/format";

type Days = 1 | 3 | 7;
const DAYS: Days[] = [1, 3, 7];

interface Errors {
  name?: string;
  price?: string;
  form?: string;
}

export default function ItemForm() {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [features, setFeatures] = useState("");
  const [story, setStory] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState<Days>(3);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const { user, ready } = useAuth();

  const priceNumber = Number(price);

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = "물건 이름을 적어 주세요.";
    if (!price) {
      next.price = "시작가를 적어 주세요.";
    } else if (priceNumber < BID_STEP || priceNumber % BID_STEP !== 0) {
      next.price = `시작가는 ${formatMong(BID_STEP)} 몽 이상, ${formatMong(BID_STEP)} 몽 단위로 정해 주세요.`;
    }
    return next;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const result = await createItem({
      name: name.trim(),
      tagline: tagline.trim(),
      features,
      story,
      startPrice: priceNumber,
      days,
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }
    setNewId(result.id);
    setDone(true);
  }

  if (!ready) return null;

  if (!user) {
    return (
      <section className="container auth-single">
        <div className="auth-card gate">
          <div className="auth-head">
            <h1>로그인이 필요해요</h1>
            <p>
              내 상상 물건을 경매에 올리려면 먼저 로그인해 주세요. 아직 계정이
              없다면 가입하고 10,000 몽을 받아 가세요.
            </p>
          </div>
          <div className="auth-actions">
            <Link
              href={`/login?next=${encodeURIComponent("/items/new")}`}
              className="btn btn-primary"
            >
              로그인
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent("/items/new")}`}
              className="btn btn-outline"
            >
              회원가입
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (done) {
    return (
      <section className="container form-layout">
        <div className="form-card done">
          <h2>경매에 올렸어요</h2>
          <p className="hint">
            &lsquo;{name.trim()}&rsquo; 물건이 {days}일 동안 경매에 올라가요.
          </p>
          {newId && (
            <Link href={`/items/${newId}`} className="btn btn-primary">
              올린 물건 보러 가기
            </Link>
          )}
          <Link href="/" className="btn btn-outline">
            경매 목록으로
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="container page-head">
        <h1>내 상상 물건 등록하기</h1>
        <p>
          있으면 좋겠다고 생각한 물건을 자유롭게 적어 보세요. 기능만큼 만든 이유도
          가격에 큰 영향을 줘요.
        </p>
      </section>

      <section className="container form-layout">
        <form className="form-card" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="item-name">물건 이름</label>
            <input
              id="item-name"
              className="input"
              type="text"
              placeholder="예: 하루를 10분 늘려 주는 시계"
              value={name}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "item-name-err" : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <div id="item-name-err" className="field-error">
                {errors.name}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="item-tagline">한 줄 소개</label>
            <input
              id="item-tagline"
              className="input"
              type="text"
              placeholder="목록 카드에 함께 보이는 짧은 설명이에요"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="item-features">기능과 특징</label>
            <textarea
              id="item-features"
              className="textarea"
              rows={5}
              placeholder="이 물건은 무엇을 할 수 있나요? 줄을 바꿔 하나씩 적어 주세요."
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="item-story">만든 이유와 이야기</label>
            <textarea
              id="item-story"
              className="textarea"
              rows={5}
              placeholder="어떤 순간에 이 물건이 떠올랐나요?"
              value={story}
              onChange={(e) => setStory(e.target.value)}
            />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="item-price">시작가 (몽)</label>
              <input
                id="item-price"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="1,000"
                value={price ? formatMong(priceNumber) : ""}
                aria-invalid={!!errors.price}
                aria-describedby="item-price-hint"
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              />
              {errors.price ? (
                <div id="item-price-hint" className="field-error">
                  {errors.price}
                </div>
              ) : (
                <div id="item-price-hint" className="hint">
                  {formatMong(BID_STEP)} 몽 단위로 정할 수 있어요.
                </div>
              )}
            </div>

            <div className="field">
              <div className="field-title" id="days-title">
                경매 기간
              </div>
              <div className="segmented" role="group" aria-labelledby="days-title">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days === d}
                    onClick={() => setDays(d)}
                  >
                    {d}일
                  </button>
                ))}
              </div>
              <div className="hint">선택한 기간: {days}일 뒤에 마감돼요.</div>
            </div>
          </div>

          <div className="field">
            <div className="field-title">
              물건 이미지 <span className="opt">(선택)</span>
            </div>
            <button type="button" className="dropzone">
              이미지를 끌어다 놓거나 눌러서 올리기
            </button>
            <div className="hint">
              이미지가 없으면 물건 이름에 맞는 기본 그림이 보여요.
            </div>
          </div>

          <div aria-live="polite">
            {errors.form && <div className="notice notice-err">{errors.form}</div>}
          </div>

          <div className="form-actions">
            <Link href="/" className="btn btn-ghost">
              취소
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "올리는 중…" : "경매에 올리기"}
            </button>
          </div>
        </form>

        <aside className="preview" aria-label="미리보기">
          <div className="preview-title">이렇게 보여요</div>
          <div className="card card-static">
            <div className="card-art" style={{ background: "#E9E4FF" }}>
              <ItemArt kind="clock" />
            </div>
            <div className="card-body">
              <div className="card-name">{name.trim() || "물건 이름이 여기에 보여요"}</div>
              <div className="card-maker">만든 사람 · {user.nickname}</div>
              <div className="price-row">
                <div>
                  <div className="price-label">시작가</div>
                  <div className="price-value">
                    {formatMong(priceNumber || 1000)} 몽
                  </div>
                </div>
                <div className="price-right">
                  <div className="price-label">경매 기간</div>
                  <div className="time-value">{days}일</div>
                </div>
              </div>
            </div>
          </div>
          <div className="preview-note">
            등록한 물건은 경매가 시작되면 수정할 수 없어요. 이름과 사연을 한 번 더
            확인해 주세요.
          </div>
        </aside>
      </section>
    </>
  );
}
