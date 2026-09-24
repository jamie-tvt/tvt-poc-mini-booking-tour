import type { Metadata } from "next";
import { BookingForm } from "@/features/bookings/components/BookingForm";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Đặt tour" };

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <BookingForm tourId={id} departureId={firstParam(sp.departureId)} />;
}
