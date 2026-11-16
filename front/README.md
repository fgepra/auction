# 상상 경매 (프론트엔드)

세상에 없는 물건을 올리고 가상 화폐 '몽'으로 입찰하는 경매 사이트의 Next.js(App Router, TypeScript) 프론트엔드입니다.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## 구조

- `src/app` : 페이지 (`/`, `/items/[id]`, `/items/new`)와 전역 스타일
- `src/components` : Header, ItemCard, ItemGrid, ItemDetail, ItemForm 등
- `src/lib/api.ts` : 데이터 접근 함수. 지금은 `data.ts`의 예시 데이터를 돌려주며, Node.js 백엔드 연결 시 이 파일만 fetch 호출로 바꾸면 됩니다.
- `src/lib/data.ts` : 예시 데이터 (모두 상상의 물건)
