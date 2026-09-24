import type { Metadata } from "next";
import { MockGateway } from "@/features/payments/components/MockGateway";

export const metadata: Metadata = { title: "Cổng thanh toán giả lập" };

export default async function MockPayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  return <MockGateway paymentId={paymentId} />;
}
