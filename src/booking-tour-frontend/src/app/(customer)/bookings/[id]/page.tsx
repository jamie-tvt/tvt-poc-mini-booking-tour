import type { Metadata } from "next";
import { BookingDetailView } from "@/features/bookings/components/BookingDetailView";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Chi tiết đơn" };

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <BookingDetailView key={id} id={id} paid={firstParam(sp.paid)} />;
}
