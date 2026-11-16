import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemDetail from "@/components/ItemDetail";
import { getItem } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  return { title: item ? `${item.name} · 상상 경매` : "상상 경매" };
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  return <ItemDetail item={item} />;
}
