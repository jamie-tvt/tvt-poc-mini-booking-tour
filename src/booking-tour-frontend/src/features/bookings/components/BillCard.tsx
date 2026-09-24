import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import type { BillDto } from "@/types/domain";
import { PaymentStatusBadge } from "./BookingStatusBadge";

export function BillCard({ bill }: { bill: BillDto }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Receipt className="size-5 text-brand" aria-hidden="true" /> Hoá đơn
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-ink-soft">Mã hoá đơn</dt>
        <dd className="text-right font-mono font-semibold">{bill.billCode}</dd>
        <dt className="text-ink-soft">Ngày lập</dt>
        <dd className="text-right">{formatDateTime(bill.createdAt)}</dd>
        <dt className="text-ink-soft">Số tiền</dt>
        <dd className="text-right font-semibold">{formatVnd(bill.amount)}</dd>
      </dl>
      {bill.payments?.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold">Lịch sử thanh toán</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {bill.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                <span>
                  <span className="font-semibold">{formatVnd(p.amount)}</span>
                  <span className="block text-xs text-ink-soft">
                    {p.provider === "MOCK" ? "Cổng giả lập" : "Stripe"}
                    {p.transactionCode ? ` · ${p.transactionCode}` : ""} · {formatDateTime(p.paidAt ?? p.createdAt)}
                  </span>
                </span>
                <PaymentStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
