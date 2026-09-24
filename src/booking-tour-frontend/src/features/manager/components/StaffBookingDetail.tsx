"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, ChevronLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { BillCard } from "@/features/bookings/components/BillCard";
import { BookingStatusBadge, PaymentStatusBadge } from "@/features/bookings/components/BookingStatusBadge";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDateRange, formatDateTime, formatVnd } from "@/lib/utils/format";
import { managerService } from "../services/managerService";

export function StaffBookingDetail({ id, backHref }: { id: string; backHref: string }) {
  const { user } = useAuth();
  const q = useApiQuery(`staff-booking-${id}`, () => managerService.booking(id));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const cancel = useMutation(managerService.adminCancelBooking);

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const b = q.data;
  const canAdminCancel = user?.role === "ADMIN" && (b.status === "PENDING" || b.status === "CONFIRMED");

  async function confirmCancel() {
    if (reason.trim().length < 5) {
      setReasonErr("Vui lòng nhập lý do (tối thiểu 5 ký tự).");
      return;
    }
    setReasonErr(undefined);
    const res = await cancel.run(b.id, reason.trim());
    if (res) {
      q.setData(res);
      setOpen(false);
      setNotice("Đã huỷ đơn đặt tour.");
    }
  }

  return (
    <div>
      <Link href={backHref} className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Danh sách đơn
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Đơn <span className="font-mono">{b.bookingCode}</span>
        </h1>
        <BookingStatusBadge status={b.status} />
        {canAdminCancel && (
          <Button variant="danger" size="sm" className="ml-auto" onClick={() => setOpen(true)}>
            <Ban className="size-4" aria-hidden="true" /> Huỷ đơn
          </Button>
        )}
      </div>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Thông tin đơn</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-soft">Tour</dt>
            <dd className="text-right font-semibold">{b.tourTitle}</dd>
            <dt className="text-ink-soft">Đợt</dt>
            <dd className="text-right">{formatDateRange(b.departure?.startAt, b.departure?.endAt)}</dd>
            <dt className="text-ink-soft">Hướng dẫn viên</dt>
            <dd className="text-right">{b.departure?.tourGuideName ?? "—"}</dd>
            <dt className="text-ink-soft">Số vé</dt>
            <dd className="text-right">
              {b.adultQuantity} người lớn, {b.childQuantity} trẻ em
            </dd>
            <dt className="text-ink-soft">Tổng tiền</dt>
            <dd className="text-right font-semibold text-cta">{formatVnd(b.totalPrice)}</dd>
            <dt className="text-ink-soft">Đặt lúc</dt>
            <dd className="text-right">{formatDateTime(b.bookedAt)}</dd>
            {b.expiresAt && b.status === "PENDING" && (
              <>
                <dt className="text-ink-soft">Hạn thanh toán</dt>
                <dd className="text-right">{formatDateTime(b.expiresAt)}</dd>
              </>
            )}
            {b.paymentStatus && (
              <>
                <dt className="text-ink-soft">Thanh toán</dt>
                <dd className="text-right">
                  <PaymentStatusBadge status={b.paymentStatus} />
                </dd>
              </>
            )}
            {b.cancelReason && (
              <>
                <dt className="text-ink-soft">Lý do huỷ</dt>
                <dd className="text-right">{b.cancelReason}</dd>
              </>
            )}
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Khách hàng</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-soft">Họ tên</dt>
            <dd className="text-right font-semibold">{b.customer?.fullName}</dd>
            <dt className="text-ink-soft">Email</dt>
            <dd className="break-all text-right">{b.customer?.email}</dd>
            <dt className="text-ink-soft">Điện thoại</dt>
            <dd className="text-right">{b.customer?.phone ?? "—"}</dd>
          </dl>
        </Card>
        {b.bill && <BillCard bill={b.bill} />}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Huỷ đơn đặt tour?"
        description={`${b.bookingCode} — ${b.customer?.fullName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Không huỷ
            </Button>
            <Button variant="danger" onClick={confirmCancel} loading={cancel.pending}>
              Xác nhận huỷ đơn
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextAreaField id="admin-cancel-reason" label="Lý do huỷ" value={reason} onChange={(e) => setReason(e.target.value)} error={reasonErr ?? cancel.fieldErrors.reason} required />
          {cancel.error && !cancel.error.errors.length && <Alert tone="error">{cancel.error.message}</Alert>}
        </div>
      </Dialog>
    </div>
  );
}
