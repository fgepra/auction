// 서버를 직접 띄워서 핵심 흐름을 처음부터 끝까지 확인한다.   npm run smoke
//  가입 → 로그인 → 물건 등록 → 입찰(환불·에스크로) → 동시 입찰 → 마감 낙찰 → 마이 페이지 → 로그아웃
// 테스트 계정과 물건이 DB에 남으니, 개발용 DB에서만 실행하세요. (지우려면 npm run db:reset)
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { pool, query } from "../src/db.js";
import { closeExpiredAuctions } from "../src/services/closer.js";

if (config.isProd) {
  console.error("운영 환경에서는 실행하지 않아요.");
  process.exit(1);
}
void config.jwtSecret;

const server = createApp().listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

/** 쿠키를 기억하는 간단한 HTTP 클라이언트 (브라우저 한 명) */
class Client {
  cookie = "";

  async req(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const [name, value] = pair.split("=");
      if (name === "auction_token") this.cookie = value ? `${name}=${value}` : "";
    }
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  get = (path) => this.req("GET", path);
  post = (path, body) => this.req("POST", path, body ?? {});
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${name}\n      ${err.message.split("\n").join("\n      ")}`);
  }
}
const expectStatus = (res, status) =>
  assert.equal(res.status, status, `응답 ${res.status} (기대 ${status}): ${JSON.stringify(res.body)}`);

const run = Date.now().toString(36).slice(-5);
const A = new Client(); // 판매자
const B = new Client();
const C = new Client();
const accounts = {
  A: { email: `a-${run}@smoke.test`, nickname: `판매${run}`, password: "password1234" },
  B: { email: `b-${run}@smoke.test`, nickname: `비${run}`, password: "password1234" },
  C: { email: `c-${run}@smoke.test`, nickname: `씨${run}`, password: "password1234" },
};
const balanceOf = async (client) => (await client.get("/api/auth/me")).body.user.balance;
const newItem = (overrides = {}) => ({
  name: `스모크 물건 ${run}`,
  tagline: "테스트",
  features: "첫째 기능\n둘째 기능\n",
  story: "테스트용 이야기",
  startPrice: 1000,
  days: 1,
  ...overrides,
});

let itemId;
console.log(`\n서버 ${base}  (DB: ${config.db.database})\n`);

console.log("기본");
await test("상태 확인 /api/health", async () => {
  const res = await new Client().get("/api/health");
  expectStatus(res, 200);
  assert.equal(res.body.ok, true);
});
await test("없는 주소는 404", async () => {
  expectStatus(await new Client().get("/api/nope"), 404);
});

console.log("\n회원가입 / 로그인 / 로그아웃");
await test("가입하면 10,000몽을 받고 바로 로그인된다", async () => {
  for (const [key, client] of Object.entries({ A, B, C })) {
    const res = await client.post("/api/auth/signup", accounts[key]);
    expectStatus(res, 201);
    assert.equal(res.body.user.balance, 10000);
    assert.equal(res.body.user.nickname, accounts[key].nickname);
    assert.ok(client.cookie, "로그인 쿠키가 있어야 해요");
    assert.equal(res.body.user.password_hash, undefined);
  }
});
await test("이메일이 겹치면 409", async () => {
  const res = await new Client().post("/api/auth/signup", {
    ...accounts.A,
    nickname: `다른${run}`,
  });
  expectStatus(res, 409);
  assert.equal(res.body.error.code, "email_taken");
});
await test("닉네임이 겹치면 409", async () => {
  const res = await new Client().post("/api/auth/signup", {
    ...accounts.A,
    email: `x-${run}@smoke.test`,
  });
  expectStatus(res, 409);
  assert.equal(res.body.error.code, "nickname_taken");
});
await test("입력이 잘못되면 400 + 필드별 안내", async () => {
  const res = await new Client().post("/api/auth/signup", {
    email: "nope",
    nickname: "a",
    password: "short",
  });
  expectStatus(res, 400);
  assert.deepEqual(Object.keys(res.body.error.fields).sort(), ["email", "nickname", "password"]);
});
await test("틀린 비밀번호·없는 이메일은 같은 메시지로 401", async () => {
  const wrong = await new Client().post("/api/auth/login", { ...accounts.A, password: "wrong-password" });
  const none = await new Client().post("/api/auth/login", { email: `none-${run}@smoke.test`, password: "password1234" });
  expectStatus(wrong, 401);
  expectStatus(none, 401);
  assert.equal(wrong.body.error.message, none.body.error.message);
});
await test("로그인하면 /me 로 내 정보를 볼 수 있다", async () => {
  const me = new Client();
  expectStatus(await me.post("/api/auth/login", accounts.B), 200);
  const res = await me.get("/api/auth/me");
  expectStatus(res, 200);
  assert.equal(res.body.user.email, accounts.B.email);
});
await test("로그인하지 않으면 /me, 등록, 입찰이 401", async () => {
  const guest = new Client();
  expectStatus(await guest.get("/api/auth/me"), 401);
  expectStatus(await guest.post("/api/items", newItem()), 401);
  expectStatus(await guest.post("/api/items/1/bids", { amount: 1000 }), 401);
  expectStatus(await guest.get("/api/me/purchases"), 401);
});
await test("다른 사이트(Origin)에서 온 변경 요청은 403", async () => {
  const res = await A.req("POST", "/api/items", newItem(), { Origin: "http://evil.example" });
  expectStatus(res, 403);
});

console.log("\n물건 등록 / 조회");
await test("물건을 등록하면 201 과 id", async () => {
  const res = await A.post("/api/items", newItem());
  expectStatus(res, 201);
  itemId = res.body.id;
  assert.match(itemId, /^\d+$/);
});
await test("시작가가 100몽 단위가 아니면 400", async () => {
  const res = await A.post("/api/items", newItem({ startPrice: 150 }));
  expectStatus(res, 400);
  assert.ok(res.body.error.fields.startPrice);
});
await test("목록에 새 물건이 보이고, 정렬 옵션이 동작한다", async () => {
  for (const sort of ["all", "urgent", "popular", "new"]) {
    const res = await new Client().get(`/api/items?sort=${sort}`);
    expectStatus(res, 200);
    assert.ok(Array.isArray(res.body.items));
  }
  const res = await new Client().get("/api/items");
  const found = res.body.items.find((item) => item.id === itemId);
  assert.ok(found, "방금 등록한 물건이 목록에 있어야 해요");
  assert.equal(found.maker, accounts.A.nickname);
  assert.equal(found.currentPrice, 1000);
});
await test("상세에 기능 목록과 최소 입찰가가 있다", async () => {
  const res = await new Client().get(`/api/items/${itemId}`);
  expectStatus(res, 200);
  assert.deepEqual(res.body.item.features, ["첫째 기능", "둘째 기능"]);
  assert.equal(res.body.item.minBid, 1000);
  assert.deepEqual(res.body.item.bids, []);
});
await test("없는 물건/잘못된 id는 404", async () => {
  expectStatus(await new Client().get("/api/items/999999999"), 404);
  expectStatus(await new Client().get("/api/items/abc"), 404);
});

console.log("\n입찰 (에스크로와 환불)");
await test("내 물건에는 입찰할 수 없다 (403)", async () => {
  expectStatus(await A.post(`/api/items/${itemId}/bids`, { amount: 1000 }), 403);
});
await test("100몽 단위가 아닌 금액은 400", async () => {
  expectStatus(await B.post(`/api/items/${itemId}/bids`, { amount: 1050 }), 400);
});
await test("시작가보다 낮으면 409 + 최소 입찰가", async () => {
  const res = await B.post(`/api/items/${itemId}/bids`, { amount: 900 });
  expectStatus(res, 409);
  assert.equal(res.body.error.code, "bid_too_low");
  assert.equal(res.body.error.minBid, 1000);
});
await test("B가 1,000몽으로 입찰하면 지갑에서 바로 빠진다", async () => {
  const res = await B.post(`/api/items/${itemId}/bids`, { amount: 1000 });
  expectStatus(res, 201);
  assert.equal(res.body.item.currentPrice, 1000);
  assert.equal(res.body.item.minBid, 1100);
  assert.equal(res.body.balance, 9000);
  assert.equal(await balanceOf(B), 9000);
});
await test("같은 금액으로는 다시 입찰할 수 없다 (409)", async () => {
  expectStatus(await C.post(`/api/items/${itemId}/bids`, { amount: 1000 }), 409);
});
await test("C가 더 높게 입찰하면 B의 몽이 돌아온다", async () => {
  expectStatus(await C.post(`/api/items/${itemId}/bids`, { amount: 1200 }), 201);
  assert.equal(await balanceOf(B), 10000);
  assert.equal(await balanceOf(C), 8800);
});
await test("내가 최고가일 때 올리면 늘어난 만큼만 빠진다", async () => {
  expectStatus(await B.post(`/api/items/${itemId}/bids`, { amount: 1500 }), 201); // C 환불
  assert.equal(await balanceOf(C), 10000);
  expectStatus(await B.post(`/api/items/${itemId}/bids`, { amount: 1700 }), 201); // +200만
  assert.equal(await balanceOf(B), 10000 - 1700);
});
await test("지갑보다 큰 금액은 409", async () => {
  const res = await C.post(`/api/items/${itemId}/bids`, { amount: 20000 });
  expectStatus(res, 409);
  assert.equal(res.body.error.code, "insufficient_balance");
});
await test("상세의 입찰 기록이 최신순이고 닉네임이 보인다", async () => {
  const res = await new Client().get(`/api/items/${itemId}`);
  const { bids, currentPrice, bidCount } = res.body.item;
  assert.equal(currentPrice, 1700);
  assert.equal(bidCount, 4);
  assert.deepEqual(
    bids.map((b) => b.amount),
    [1700, 1500, 1200, 1000],
    "같은 사람이 올린 입찰도 모두 남아야 해요 (1700, 1500)",
  );
  assert.equal(bids[0].who, accounts.B.nickname);
});

console.log("\n동시 입찰");
await test("B와 C가 같은 금액을 동시에 불러도 한 명만 성공하고, 몽이 새지 않는다", async () => {
  const amounts = Array.from({ length: 10 }, (_, i) => 1800 + i * 100);
  const results = await Promise.all(
    amounts.flatMap((amount) => [
      B.post(`/api/items/${itemId}/bids`, { amount }),
      C.post(`/api/items/${itemId}/bids`, { amount }),
    ]),
  );
  for (const res of results) {
    assert.ok([201, 409].includes(res.status), `예상 밖 응답 ${res.status}: ${JSON.stringify(res.body)}`);
  }
  assert.ok(results.some((r) => r.status === 201), "성공한 입찰이 하나는 있어야 해요");

  const [item] = await query("SELECT current_price, bid_count FROM items WHERE id = ?", [itemId]);
  const [{ n, top }] = await query(
    "SELECT COUNT(*) AS n, MAX(amount) AS top FROM bids WHERE item_id = ?",
    [itemId],
  );
  assert.equal(Number(item.bid_count), Number(n), "bid_count 와 입찰 행 수가 같아야 해요");
  assert.equal(Number(item.current_price), Number(top), "현재가는 가장 높은 입찰이어야 해요");
  const dup = await query(
    "SELECT amount FROM bids WHERE item_id = ? GROUP BY amount HAVING COUNT(*) > 1",
    [itemId],
  );
  assert.equal(dup.length, 0, "같은 금액의 입찰이 둘 있으면 안 돼요");

  // A, B, C 세 사람의 몽 + 지금 묶여 있는 최고가 = 처음 합계(30,000)
  const total = (await balanceOf(A)) + (await balanceOf(B)) + (await balanceOf(C)) + Number(item.current_price);
  assert.equal(total, 30000, "몽의 총합이 변하면 안 돼요");
});

console.log("\n마감 · 낙찰");
let finalPrice;
let winner;
await test("마감 시각이 지나면 최고가 입찰자가 낙찰받고 판매자가 몽을 받는다", async () => {
  const [before] = await query("SELECT current_price FROM items WHERE id = ?", [itemId]);
  finalPrice = Number(before.current_price);
  const [topBid] = await query(
    `SELECT u.nickname FROM bids b JOIN users u ON u.id = b.user_id
     WHERE b.item_id = ? ORDER BY b.amount DESC LIMIT 1`,
    [itemId],
  );
  winner = topBid.nickname;

  await query("UPDATE items SET ends_at = NOW(3) - INTERVAL 1 SECOND WHERE id = ?", [itemId]);
  const closed = await closeExpiredAuctions();
  assert.ok(closed >= 1);

  const res = await new Client().get(`/api/items/${itemId}`);
  assert.equal(res.body.item.status, "sold");
  assert.equal(res.body.item.winner, winner);
  assert.equal(await balanceOf(A), 10000 + finalPrice, "판매자는 낙찰가를 받아야 해요");

  const total = (await balanceOf(A)) + (await balanceOf(B)) + (await balanceOf(C));
  assert.equal(total, 30000, "몽의 총합이 변하면 안 돼요");
});
await test("이미 정리된 경매를 다시 정리해도 몽이 두 번 지급되지 않는다", async () => {
  const before = await balanceOf(A);
  await closeExpiredAuctions();
  assert.equal(await balanceOf(A), before);
});
await test("끝난 경매에는 입찰할 수 없다 (409)", async () => {
  const res = await C.post(`/api/items/${itemId}/bids`, { amount: finalPrice + 100 });
  expectStatus(res, 409);
  assert.equal(res.body.error.code, "auction_ended");
});
await test("목록에서는 끝난 물건이 사라진다", async () => {
  const res = await new Client().get("/api/items?limit=100");
  assert.equal(res.body.items.some((item) => item.id === itemId), false);
});

console.log("\n마이 페이지");
await test("낙찰자의 낙찰 내역에 입찰 흐름이 나온다", async () => {
  const client = winner === accounts.B.nickname ? B : C;
  const res = await client.get("/api/me/purchases");
  expectStatus(res, 200);
  const mine = res.body.purchases.find((p) => p.id === itemId);
  assert.ok(mine, "낙찰 내역에 물건이 있어야 해요");
  assert.equal(mine.finalPrice, finalPrice);
  assert.equal(mine.myBids.at(-1), finalPrice);
  assert.deepEqual([...mine.myBids].sort((a, b) => a - b), mine.myBids, "내 입찰은 오름차순");
  assert.ok(mine.tookSec >= 0);
  assert.equal(mine.maker, accounts.A.nickname);
});
await test("판매자의 등록 물건에 낙찰 결과가 나온다", async () => {
  const res = await A.get("/api/me/listings");
  expectStatus(res, 200);
  const listing = res.body.listings.find((l) => l.id === itemId);
  assert.equal(listing.status, "sold");
  assert.equal(listing.winner, winner);
  assert.equal(listing.currentPrice, finalPrice);
});
await test("입찰이 없던 경매는 마감되면 유찰", async () => {
  const created = await A.post("/api/items", newItem({ name: `유찰 물건 ${run}`, startPrice: 300 }));
  expectStatus(created, 201);
  await query("UPDATE items SET ends_at = NOW(3) - INTERVAL 1 SECOND WHERE id = ?", [created.body.id]);
  const before = await balanceOf(A);
  await closeExpiredAuctions();
  const listings = (await A.get("/api/me/listings")).body.listings;
  assert.equal(listings.find((l) => l.id === created.body.id).status, "unsold");
  assert.equal(await balanceOf(A), before);
});

console.log("\n로그아웃");
await test("로그아웃하면 쿠키가 지워지고 /me 가 401", async () => {
  const res = await B.post("/api/auth/logout");
  expectStatus(res, 204);
  assert.equal(B.cookie, "");
  expectStatus(await B.get("/api/auth/me"), 401);
});
await test("로그아웃은 로그인 안 한 상태에서도 204", async () => {
  expectStatus(await new Client().post("/api/auth/logout"), 204);
});
await test("망가진 JSON은 400", async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  assert.equal(res.status, 400);
});

console.log(`\n${passed}개 통과, ${failed}개 실패\n`);
server.close();
await pool.end();
process.exit(failed > 0 ? 1 : 0);
