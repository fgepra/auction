// 개발용 예시 데이터를 넣는다.   npm run db:seed
// 프론트엔드의 예시 데이터(경매 8개, 마이 페이지의 낙찰 내역·등록 물건)와 같은 내용이다.
//
//  - 모든 계정의 비밀번호는 password1234 이다. (개발 전용!)
//  - 로그인해서 마이 페이지를 볼 계정: demo@example.com
//  - 시드 데이터는 몽 입출금 기록(wallet_transactions)을 따로 남기지 않는다.
//    다만 진행 중인 경매의 최고 입찰자는 입찰 금액만큼 몽이 묶여 있도록 잔액을 맞춰 둔다.
import { readFile } from "node:fs/promises";
import { pool, q, withTransaction } from "../src/db.js";
import { hashPassword } from "../src/services/users.js";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const PASSWORD = "password1234";
const START_BALANCE = 30000;
const DEMO = { nickname: "데모", email: "demo@example.com", balance: 12400 };

const EMAILS = {
  소리: "sori",
  달그림: "dalgeurim",
  오후세시: "ohusesi",
  하루: "haru",
  이든: "eden",
  새벽네시: "saebyeok",
  모모: "momo",
  윤슬: "yunseul",
  하늘다람: "haneuldaram",
  별빛수집가: "byeolbit",
  모래시계: "moraesigye",
  밤산책: "bamsanchaek",
};

const load = async (name) =>
  JSON.parse(await readFile(new URL(`./seed/${name}.json`, import.meta.url), "utf8"));

/** 'YYYY-MM-DD' 의 낮 12시(한국 시간) */
const noon = (date) => new Date(`${date}T03:00:00Z`);

/** i번째 시각 (from 에서 to 까지 고르게) */
function spread(from, to, i, n) {
  if (n <= 1) return new Date(from);
  return new Date(from + ((to - from) * i) / (n - 1));
}

/** 시작가에서 현재가까지 count번의 입찰 금액을 100몽 단위로 만든다. */
function ladder(start, current, count) {
  const amounts = [];
  let prev = 0;
  for (let i = 0; i < count; i++) {
    const raw = start + ((current - start) * (i + 1)) / count;
    let amount = i === count - 1 ? current : Math.round(raw / 100) * 100;
    if (amount <= prev) amount = prev + 100;
    if (amount < start || amount > current || (i === count - 1 && amount !== current)) {
      throw new Error(`입찰 금액을 만들 수 없어요: ${start} → ${current} (${count}번)`);
    }
    amounts.push(amount);
    prev = amount;
  }
  return amounts;
}

const itemsData = await load("items");
const purchasesData = await load("purchases");
const listingsData = await load("listings");

const [{ n }] = (await pool.query("SELECT COUNT(*) AS n FROM users"))[0];
if (n > 0) {
  console.error("이미 데이터가 있어요. 먼저 `npm run db:reset` 으로 비운 뒤 다시 실행해 주세요.");
  await pool.end();
  process.exit(1);
}

const passwordHash = await hashPassword(PASSWORD);
const now = Date.now();

await withTransaction(async (conn) => {
  // ── 사용자 ──────────────────────────────────────────────
  const ids = {};
  for (const [nickname, handle] of Object.entries(EMAILS)) {
    const r = await q(
      conn,
      "INSERT INTO users (email, nickname, password_hash, balance) VALUES (?, ?, ?, ?)",
      [`${handle}@example.com`, nickname, passwordHash, START_BALANCE],
    );
    ids[nickname] = r.insertId;
  }
  const demo = await q(
    conn,
    "INSERT INTO users (email, nickname, password_hash, balance) VALUES (?, ?, ?, ?)",
    [DEMO.email, DEMO.nickname, passwordHash, DEMO.balance],
  );
  ids[DEMO.nickname] = demo.insertId;

  const hold = (nickname, amount) =>
    q(conn, "UPDATE users SET balance = balance - ? WHERE id = ?", [amount, ids[nickname]]);

  async function insertItem(f) {
    const r = await q(
      conn,
      `INSERT INTO items
         (seller_id, name, tagline, features, story, art, start_price, current_price,
          bid_count, status, winner_id, ends_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.sellerId, f.name, f.tagline ?? "", JSON.stringify(f.features), f.story,
        f.art, f.startPrice, f.currentPrice, f.bidCount, f.status ?? "active",
        f.winnerId ?? null, f.endsAt, f.createdAt,
      ],
    );
    return r.insertId;
  }

  const insertBid = (itemId, userId, amount, at) =>
    q(conn, "INSERT INTO bids (item_id, user_id, amount, created_at) VALUES (?, ?, ?, ?)", [
      itemId, userId, amount, at,
    ]);

  // ── 홈에 보이는 진행 중인 경매 8개 ─────────────────────────
  for (const it of itemsData) {
    const oldest = Math.max(0, ...it.bids.map((b) => b.minAgo));
    const top = it.bids.at(-1);
    const itemId = await insertItem({
      sellerId: ids[it.maker],
      name: it.name,
      tagline: it.tagline,
      features: it.features,
      story: it.story,
      art: it.art,
      startPrice: it.startPrice,
      currentPrice: top ? top.amount : it.startPrice,
      bidCount: it.bids.length,
      endsAt: new Date(now + it.endsInMin * MIN),
      createdAt: new Date(now - (oldest + 180) * MIN),
    });
    for (const bid of it.bids) {
      await insertBid(itemId, ids[bid.who], bid.amount, new Date(now - bid.minAgo * MIN));
    }
    if (top) await hold(top.who, top.amount); // 최고 입찰자의 몽은 묶여 있다.
  }

  // ── 데모 계정의 낙찰 내역 (마이 페이지) ─────────────────────
  for (const p of purchasesData) {
    const endsAt = noon(p.wonDate);
    const first = endsAt.getTime() - p.tookHours * HOUR;
    const last = endsAt.getTime() - 5 * MIN;
    const final = p.myBids.at(-1);
    const itemId = await insertItem({
      sellerId: ids[p.maker],
      name: p.name,
      features: ["상상 속에서만 쓸 수 있는 물건이에요."],
      story: "마이 페이지 예시로 미리 넣어 둔 낙찰 기록이에요.",
      art: p.art,
      startPrice: p.startPrice,
      currentPrice: final,
      bidCount: p.myBids.length,
      status: "sold",
      winnerId: ids[DEMO.nickname],
      endsAt,
      createdAt: new Date(first - 3 * HOUR),
    });
    for (const [i, amount] of p.myBids.entries()) {
      await insertBid(itemId, ids[DEMO.nickname], amount, spread(first, last, i, p.myBids.length));
    }
  }

  // ── 데모 계정이 등록한 물건 (마이 페이지) ───────────────────
  const bidders = Object.keys(EMAILS);
  for (const l of listingsData) {
    const createdAt = noon(l.registeredDate);
    const endsAt = l.status === "active" ? new Date(now + l.endsInMin * MIN) : noon(l.endDate);
    const winnerId = l.winner ? ids[l.winner] : null;
    const itemId = await insertItem({
      sellerId: ids[DEMO.nickname],
      name: l.name,
      features: ["상상 속에서만 쓸 수 있는 물건이에요."],
      story: "마이 페이지 예시로 미리 넣어 둔 등록 물건이에요.",
      art: l.art,
      startPrice: l.startPrice,
      currentPrice: l.currentPrice,
      bidCount: l.bidCount,
      status: l.status,
      winnerId,
      endsAt,
      createdAt,
    });

    if (l.bidCount > 0) {
      const pool_ = bidders.filter((name) => name !== l.winner);
      const rotation = l.winner ? [...pool_, l.winner] : pool_;
      // 마지막 입찰자가 낙찰자가 되도록 순서를 맞춘다.
      const lastName = l.winner ?? rotation[(l.bidCount - 1) % rotation.length];
      const offset =
        (((rotation.indexOf(lastName) - (l.bidCount - 1)) % rotation.length) + rotation.length) %
        rotation.length;
      const amounts = ladder(l.startPrice, l.currentPrice, l.bidCount);
      const from = createdAt.getTime() + 30 * MIN;
      const to = Math.min(now, endsAt.getTime()) - 10 * MIN;
      for (const [i, amount] of amounts.entries()) {
        const who = rotation[(i + offset) % rotation.length];
        await insertBid(itemId, ids[who], amount, spread(from, to, i, amounts.length));
      }
      // 진행 중이면 최고 입찰자의 몽이 묶이고, 낙찰됐다면 낙찰자가 낸 만큼 줄어 있다.
      await hold(lastName, l.currentPrice);
    }
  }

  console.log(`사용자 ${Object.keys(ids).length}명, 경매 ${itemsData.length + purchasesData.length + listingsData.length}개를 넣었어요.`);
});

console.log("");
console.log(`로그인 계정: ${DEMO.email} / ${PASSWORD}  (닉네임 ${DEMO.nickname})`);
console.log(`그 밖의 계정: ${Object.values(EMAILS)[0]}@example.com 등 / ${PASSWORD}`);
await pool.end();
