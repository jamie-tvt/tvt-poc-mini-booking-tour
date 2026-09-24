import type { Metadata } from "next";
import { StaffBookingDetail } from "@/features/manager/components/StaffBookingDetail";

export const metadata: Metadata = { title: "Chi tiết đơn" };

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffBookingDetail key={id} id={id} backHref="/admin/bookings" />;
}
