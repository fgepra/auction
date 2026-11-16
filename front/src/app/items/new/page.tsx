import type { Metadata } from "next";
import ItemForm from "@/components/ItemForm";

export const metadata: Metadata = { title: "물건 등록 · 상상 경매" };

export default function NewItemPage() {
  return <ItemForm />;
}
