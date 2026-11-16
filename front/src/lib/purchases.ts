import type { Purchase } from "./types";

/** 백엔드 연결 전까지 쓰는 예시 구매 내역 (모두 상상의 물건입니다). */
export const purchases: Purchase[] = [
  {
    id: "p1",
    name: "웃음소리를 녹음해 두는 조개껍데기",
    maker: "오후세시",
    art: "jar",
    tint: "#FFF1C9",
    startPrice: 600,
    myBids: [800, 1400, 2100],
    wonAt: "2026.10.12",
    took: "1일 6시간",
  },
  {
    id: "p2",
    name: "잠들기 전에 별을 세어 주는 베개",
    maker: "윤슬",
    art: "lamp",
    tint: "#FFEBCF",
    startPrice: 1000,
    myBids: [1100, 1500, 2300, 2900, 3600],
    wonAt: "2026.10.05",
    took: "2일 3시간",
  },
  {
    id: "p3",
    name: "한 번만 되감을 수 있는 손목시계",
    maker: "소리",
    art: "clock",
    tint: "#E9E4FF",
    startPrice: 2000,
    myBids: [4200],
    wonAt: "2026.09.28",
    took: "3시간",
  },
  {
    id: "p4",
    name: "주머니 속 작은 장마",
    maker: "새벽네시",
    art: "cloud",
    tint: "#E4E9F7",
    startPrice: 500,
    myBids: [700, 900],
    wonAt: "2026.09.20",
    took: "18시간",
  },
];
