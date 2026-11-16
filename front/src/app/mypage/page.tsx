import type { Metadata } from "next";
import MyPage from "@/components/MyPage";

export const metadata: Metadata = { title: "마이 페이지 · 상상 경매" };

export default function MyPageRoute() {
  return <MyPage />;
}
