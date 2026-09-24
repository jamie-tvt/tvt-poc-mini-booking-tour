import type { Metadata } from "next";
import { SettingsForm } from "@/features/admin/components/SettingsForm";

export const metadata: Metadata = { title: "Cài đặt hệ thống" };

export default function AdminSettingsFormPage() {
  return <SettingsForm />;
}
