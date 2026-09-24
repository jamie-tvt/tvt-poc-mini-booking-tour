import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileForm } from "@/features/account/components/ProfileForm";

export const metadata: Metadata = { title: "Tài khoản của tôi" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Tài khoản của tôi" description="Xem và cập nhật hồ sơ cá nhân." />
      <ProfileForm />
    </>
  );
}
