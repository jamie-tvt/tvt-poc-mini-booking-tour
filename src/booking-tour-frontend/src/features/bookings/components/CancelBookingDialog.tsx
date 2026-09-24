"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/Field";
import { useMutation } from "@/lib/api/hooks";
import { formatVnd } from "@/lib/utils/format";
import type { BookingDto } from "@/types/domain";
import { bookingService } from "../services/bookingService";

export function CancelBookingDialog({
  booking,
  open,
  onClose,
  onCancelled,
}: {
  booking: BookingDto;
  open: boolean;
  onClose: () => void;
  onCancelled: (b: BookingDto) => void;
}) {
  const [reason, setReason] = useState("");
  const m = useMutation((r: string) => bookingService.cancel(booking.id, r.trim()));
  const preview = booking.refundPreview;
  const isPending = booking.status === "PENDING";

  async function confirm() {
    const res = await m.run(reason);
    if (res) {
      onCancelled(res);
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Huỷ đặt tour?"
      description={`Đơn ${booking.bookingCode} — ${booking.tourTitle}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Giữ lại đơn
          </Button>
          <Button variant="danger" onClick={confirm} loading={m.pending}>
            Xác nhận huỷ
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isPending ? (
          <Alert tone="info">Đơn chưa thanh toán nên huỷ không mất phí.</Alert>
        ) : preview ? (
          <div className="rounded-xl border border-line bg-bg p-4" data-testid="refund-preview">
            <p className="text-sm text-ink-soft">Theo chính sách huỷ, bạn được hoàn</p>
            <p className="font-heading text-2xl font-bold text-ink">
              {formatVnd(preview.amount)} <span className="text-base font-semibold text-ink-soft">({preview.percent}%)</span>
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Huỷ trước ngày đi ≥ 7 ngày hoàn 100%, 3–6 ngày hoàn 50%, dưới 3 ngày không hoàn tiền.
            </p>
          </div>
        ) : null}
        <TextAreaField
          id="cancel-reason"
          label="Lý do huỷ"
          hint="Không bắt buộc"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
        {m.error && <Alert tone="error">{m.error.message}</Alert>}
      </div>
    </Dialog>
  );
}
