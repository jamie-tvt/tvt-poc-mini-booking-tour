import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { MyBookings } from "@/features/bookings/components/MyBookings";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Đơn của tôi" };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Đơn của tôi" description="Theo dõi trạng thái đặt chỗ, thanh toán và chuyến đi của bạn." />
      <MyBookings initialStatus={firstParam(sp.status)} />
    </>
  );
}
