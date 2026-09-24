import type { Metadata } from "next";
import { GuideDepartureDetail } from "@/features/operator/components/GuideDepartureDetail";

export const metadata: Metadata = { title: "Chi tiết đợt" };

export default async function OperatorDeparturePage({ params }: { params: Promise<{ departureId: string }> }) {
  const { departureId } = await params;
  return <GuideDepartureDetail key={departureId} id={departureId} />;
}
