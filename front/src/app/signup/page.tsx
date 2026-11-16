import type { Metadata } from "next";
import { Suspense } from "react";
import SignupForm from "@/components/SignupForm";

export const metadata: Metadata = { title: "회원가입 · 상상 경매" };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
