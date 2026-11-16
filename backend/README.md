# 상상 경매 백엔드

Node.js(Express) + MySQL 로 만든 "상상 경매" API 서버입니다.
프론트엔드(Next.js)에서 만든 기능 전부를 담았어요: 회원가입·로그인, 물건 등록, 입찰, 경매 마감·낙찰, 마이 페이지(낙찰 내역 / 내가 등록한 물건).

## 실행하기 (Windows 기준)

MySQL 8 (또는 MariaDB 10.5+) 이 켜져 있어야 해요. Node 20 이상을 권장합니다.

```powershell
cd backend
copy .env.example .env        # 그다음 .env 를 열어 JWT_SECRET, DB_USER, DB_PASSWORD 를 채우세요
npm install
npm run db:init               # 데이터베이스와 테이블 만들기
npm run db:seed               # (선택) 프론트 예시 데이터 넣기
npm run dev                   # http://localhost:4000
```

`JWT_SECRET` 은 길고 무작위인 문자열이어야 해요. 만들기: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

시드를 넣으면 `demo@example.com` / `password1234` 로 로그인할 수 있어요. (시드 계정은 모두 같은 비밀번호이며 개발 전용입니다.)
시드의 진행 중 경매는 "넣은 시각 기준" 몇 시간 뒤에 끝나요. 시간이 지나면 마감되어 목록에서 사라지니, 새로 보고 싶으면 `npm run db:reset` 후 `npm run db:seed`.

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 파일이 바뀌면 자동 재시작 |
| `npm start` | 일반 실행 |
| `npm run db:init` | DB·테이블 생성 (여러 번 실행해도 안전) |
| `npm run db:reset` | 테이블을 지우고 다시 생성 (개발 전용) |
| `npm run db:seed` | 예시 데이터 입력 (빈 DB에서만) |
| `npm run smoke` | 전체 흐름 자동 점검 35개 (개발용 DB에서만!) |

## API

모든 주소는 `/api` 아래에 있고, JSON 으로 주고받습니다. 로그인하면 `auction_token` 쿠키(httpOnly, 7일)가 설정돼요.

| 메서드 | 주소 | 로그인 | 설명 |
| --- | --- | --- | --- |
| GET | `/health` | | 서버 상태 |
| POST | `/auth/signup` | | `{email, nickname, password}` → 201 `{user}` (10,000몽 지급, 바로 로그인) |
| POST | `/auth/login` | | `{email, password}` → `{user}` |
| POST | `/auth/logout` | | 204 |
| GET | `/auth/me` | ✔ | `{user}` (id, email, nickname, balance) |
| GET | `/items` | | `?sort=all\|urgent\|popular\|new&limit&offset` → `{items}` (진행 중인 경매만) |
| POST | `/items` | ✔ | `{name, tagline, features, story, startPrice, days}` → 201 `{id}` |
| GET | `/items/:id` | | `{item}` 기능 목록·입찰 기록 포함 |
| POST | `/items/:id/bids` | ✔ | `{amount}` → 201 `{item:{id,currentPrice,bidCount,minBid}, balance}` |
| GET | `/me/purchases` | ✔ | 낙찰 내역 `{purchases}` |
| GET | `/me/listings` | ✔ | 내가 등록한 물건 `{listings}` (status: active / sold / unsold) |

오류는 항상 `{ "error": { "code", "message", ...추가정보 } }` 형태예요. 입력 오류(400)는 `error.fields` 에 필드별 안내가 들어갑니다.
예: 입찰가가 낮으면 409 `bid_too_low` + `minBid`, 몽이 모자라면 409 `insufficient_balance`, 끝난 경매면 409 `auction_ended`, 내 물건이면 403.

## 규칙

- 입찰은 100몽 단위. 첫 입찰은 시작가 이상, 이후는 현재가 + 100 이상. 시작가 최대 1억몽.
- 경매 기간은 1·3·7일. 판매자는 자기 물건에 입찰할 수 없어요.
- 닉네임 2~12자, 비밀번호 8자 이상.

## 몽(가상 화폐)은 이렇게 움직여요

입찰하는 순간 몽이 지갑에서 빠져 "묶여" 있다가, 누가 더 높게 부르면 바로 돌려받습니다.
내가 최고가일 때 금액을 올리면 늘어난 만큼만 더 빠져요. 경매가 끝나면 낙찰가가 판매자에게 지급되고, 입찰이 없었다면 유찰됩니다.
모든 움직임은 `wallet_transactions` 에 기록돼요 (signup_bonus, bid_hold, bid_refund, sale).

입찰은 트랜잭션 + 행 잠금(`FOR UPDATE`)으로 처리해서, 동시에 입찰이 몰려도 몽의 합계가 변하지 않아요 (`npm run smoke` 가 검증합니다).
마감은 5초마다 도는 정리 작업과, 상세 조회 시 즉시 확인하는 방식을 함께 써요.

## 프론트엔드에 연결하기

프론트의 `src/lib/api.ts` 가 이 서버를 호출해요. 프론트 폴더에 `.env.local` 을 만들고 (`.env.local.example` 참고)

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

를 적은 뒤 `npm run dev` 로 실행하세요. 백엔드를 먼저 켜 두어야 해요. 규칙 두 가지:

1. 프론트의 모든 요청은 `credentials: "include"` (쿠키 로그인) — `api.ts` 에 이미 들어 있어요.
2. 이 서버 `.env` 의 `CLIENT_ORIGIN` 이 프론트 주소와 같아야 해요 (기본 `http://localhost:3000`).

서버가 내려주는 마감 시각(`endsAt`)은 프론트에서 "02:14:09", "1일 03:40" 같은 문구로 바꿔 보여 줘요.
프론트와 백엔드를 다른 도메인에 배포하면 `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` (HTTPS 필수)가 필요해요.

## 보안 메모

- 비밀번호는 bcrypt 로 저장, 로그인 실패 메시지는 이메일 존재 여부와 상관없이 같아요.
- 변경 요청(POST 등)은 `Origin` 이 `CLIENT_ORIGIN` 이 아니면 403 (CSRF 방지).
- 로그인·가입에는 요청 횟수 제한이 있어요 (운영 15분당 30회).
- 모든 SQL 은 파라미터로 전달해서 SQL 인젝션을 막아요. `helmet` 으로 기본 보안 헤더를 붙였어요.
- `.env` 는 절대 git 에 올리지 마세요 (`.gitignore` 에 들어 있어요).
- 서버 뒤에 프록시(Nginx 등)를 둘 때는 `TRUST_PROXY=1`.

## 폴더 구조

```
sql/schema.sql        테이블 정의 (users, items, bids, wallet_transactions)
src/app.js            Express 앱 (보안·미들웨어·라우트)
src/server.js         시작 지점 (마감 작업 포함)
src/routes/           auth, items, me
src/services/         users, items, bids(에스크로), closer(마감), wallet, me
src/lib/              검증(validate), 응답 변환(serialize), 그림 고르기(art)
scripts/              init-db, seed, smoke-test
```
