import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { TourForm } from "@/features/manager/components/TourForm";

export const metadata: Metadata = { title: "Tạo tour mới" };

export default function NewTourPage() {
  return (
    <>
      <PageHeader title="Tạo tour mới" description="Sau khi tạo, bạn thêm lịch trình, ảnh và đợt khởi hành." />
      <Card>
        <TourForm />
      </Card>
    </>
  );
}
