import Link from "next/link";
import ItemArt from "@/components/ItemArt";
import ItemGrid from "@/components/ItemGrid";
import { getItems } from "@/lib/api";
import { formatMong } from "@/lib/format";

const STEPS = [
  {
    title: "상상해서 올려요",
    body: "물건의 이름과 기능, 만든 이유를 적고 시작가와 경매 기간을 정해 등록해요.",
  },
  {
    title: "몽으로 입찰해요",
    body: "사이트 안에서만 쓰는 가상 화폐 '몽'으로 가격을 불러요. 더 높은 금액이 나오면 현재가가 바뀌어요.",
  },
  {
    title: "마지막 한 명이 가져가요",
    body: "시간이 끝났을 때 가장 높은 금액을 부른 사람이 낙찰받아요. 실제 돈은 오가지 않아요.",
  },
];

/** 경매 목록은 항상 최신이어야 하니, 빌드 때 굳히지 않고 요청마다 가져온다. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await getItems();
  const featured = items[0];

  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <div className="kicker">상상 속 물건 경매</div>
          <h1>세상에 없는 물건, 당신은 얼마까지 불러 보시겠어요?</h1>
          <p className="hero-lead">
            하루를 10분 늘려 주는 시계처럼 있으면 써 보고 싶은 물건을 올리고, 가상
            화폐 &lsquo;몽&rsquo;으로 가격을 불러 보세요. 같은 물건도 사람마다 값이
            달라져요.
          </p>
          <div className="hero-actions">
            <a href="#list" className="btn btn-primary">
              경매 둘러보기
            </a>
            <Link href="/items/new" className="btn btn-outline">
              내 물건 등록하기
            </Link>
          </div>
          <p className="hero-note">
            실제 돈은 오가지 않아요. 가입하면 받는 10,000 몽으로 바로 시작할 수 있어요.
          </p>
        </div>

        {featured && (
          <Link href={`/items/${featured.id}`} className="featured">
            <div className="featured-art" style={{ background: featured.tint }}>
              <ItemArt kind={featured.art} size={200} />
              <span className="badge">오늘의 경매</span>
            </div>
            <div className="featured-body">
              <div className="featured-name">{featured.name}</div>
              <div className="price-row">
                <div>
                  <div className="price-label">현재가</div>
                  <div className="price-value">
                    {formatMong(featured.currentPrice)} 몽
                  </div>
                </div>
                <div className="price-right">
                  <div className="price-label">남은 시간</div>
                  <div className="time-value">{featured.timeLabel}</div>
                </div>
              </div>
            </div>
          </Link>
        )}
      </section>

      <ItemGrid items={items} />

      <section id="how" className="how">
        <div className="container how-inner">
          <h2>이렇게 진행돼요</h2>
          <div className="steps">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step">
                <div className="step-no">{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
