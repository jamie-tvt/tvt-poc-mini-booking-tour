import type { Metadata } from "next";
import { ReviewManager } from "@/features/admin/components/ReviewManager";

export const metadata: Metadata = { title: "Đánh giá" };

export default function AdminReviewManagerPage() {
  return <ReviewManager />;
}
