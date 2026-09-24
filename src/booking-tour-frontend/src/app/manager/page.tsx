import type { Metadata } from "next";
import { ManagerTourList } from "@/features/manager/components/ManagerTourList";

export const metadata: Metadata = { title: "Quản lý tour" };

export default function ManagerHome() {
  return <ManagerTourList />;
}
