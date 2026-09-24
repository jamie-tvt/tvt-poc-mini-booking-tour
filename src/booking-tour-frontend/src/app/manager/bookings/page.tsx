import type { Metadata } from "next";
import { StaffBookingList } from "@/features/manager/components/StaffBookingList";

export const metadata: Metadata = { title: "Đơn đặt tour" };

export default function ManagerBookingsPage() {
  return <StaffBookingList basePath="/manager/bookings" />;
}
