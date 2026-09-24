import { Badge } from "@/components/ui/Badge";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/utils/labels";
import type { BookingStatus, PaymentStatus } from "@/types/domain";

/** Badge trạng thái đơn: màu + chữ (không chỉ dựa vào màu). */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
