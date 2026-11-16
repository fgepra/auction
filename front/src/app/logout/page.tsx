import type { Metadata } from "next";
import LogoutView from "@/components/LogoutView";

export const metadata: Metadata = { title: "로그아웃 · 상상 경매" };

export default function LogoutPage() {
  return <LogoutView />;
}
