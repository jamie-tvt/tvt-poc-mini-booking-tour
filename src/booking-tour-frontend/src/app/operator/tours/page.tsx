import type { Metadata } from "next";
import { GuideDepartureList } from "@/features/operator/components/GuideDepartureList";

export const metadata: Metadata = { title: "Lịch dẫn tour" };

export default function OperatorToursPage() {
  return <GuideDepartureList />;
}
