"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, CreditCard, MapPin, Ticket, UserRound, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { TourImage } from "@/components/shared/TourImage";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateRange, formatDateTime, formatTime, formatVnd } from "@/lib/utils/format";
import type { BookingDto } from "@/types/domain";
import { bookingService } from "../services/bookingService";
import { BillCard } from "./BillCard";
import { BookingStatusBadge, PaymentStatusBadge } from "./BookingStatusBadge";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { Countdown } from "./Countdown";
import { ReviewForm } from "./ReviewForm";

export function BookingDetailView({ id, paid }: { id: string; paid?: string }) {
  const q = useApiQuery(`booking-${id}`, () => bookingService.get(id));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const pay = useMutation(bookingService.startPayment);
  const booking = q.data;
  const { reload } = q;

  // Vừa quay về từ cổng thanh toán mà đơn còn PENDING → hỏi lại vài lần (webhook có thể chậm).
  const [polls, setPolls] = useState(0);
  useEffect(() => {
    if (paid !== "1" || !booking || booking.status !== "PENDING" || polls >= 5) return;
    const t = window.setTimeout(() => {
      setPolls((n) => n + 1);
      void reload();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [paid, booking, polls, reload]);

  const onExpire = useCallback(() => {
    window.setTimeout(() => void reload(), 1500);
  }, [reload]);

  if (q.loading && !booking) return <Spinner />;
  if (q.error || !booking) {
    return <ErrorState message={q.error?.message} action={<LinkButton href="/bookings">Về danh sách đơn</LinkButton>} />;
  }

  async function startPayment(b: BookingDto) {
    const payment = await pay.run(b.id);
    if (payment?.checkoutUrl) window.location.assign(payment.checkoutUrl);
  }

  const d = booking.departure;
  return (
    <div>
      <Link href="/bookings" className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Đơn của tôi
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Đơn <span className="font-mono">{booking.bookingCode}</span>
        </h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {paid === "1" && booking.status === "CONFIRMED" && (
          <Alert tone="success" title="Thanh toán thành công">
            Đơn của bạn đã được xác nhận. Hẹn gặp bạn trong chuyến đi!
          </Alert>
        )}
        {paid === "1" && booking.status === "PENDING" && (
          <Alert tone="info">Đang chờ xác nhận thanh toán… Trang sẽ tự cập nhật.</Alert>
        )}
        {paid === "0" && booking.status === "PENDING" && (
          <Alert tone="warning" title="Thanh toán chưa thành công">
            Bạn có thể thanh toán lại trước khi hết thời gian giữ chỗ.
          </Alert>
        )}
        {notice && <Alert tone="success">{notice}</Alert>}
        {pay.error && <Alert tone="error">{pay.error.message}</Alert>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="sm:w-48 sm:shrink-0">
                <TourImage src={booking.tourCoverImageUrl} alt="" className="rounded-lg" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Link href={`/tours/${booking.tourId}`} className="text-lg font-bold hover:text-brand hover:underline">
                  {booking.tourTitle}
                </Link>
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                  {formatDateRange(d?.startAt, d?.endAt)} · khởi hành {formatTime(d?.startAt)}
                </p>
                {d?.tourGuideName && (
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <MapPin className="size-4 text-brand" aria-hidden="true" /> Hướng dẫn viên: {d.tourGuideName}
                  </p>
                )}
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <UserRound className="size-4 text-brand" aria-hidden="true" /> {booking.customer?.fullName}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-2 border-t border-line pt-4 text-sm">
              <dt className="flex items-center gap-2 text-ink-soft">
                <Ticket className="size-4" aria-hidden="true" /> Người lớn × {booking.adultQuantity}
              </dt>
              <dd className="text-right">{d ? formatVnd(booking.adultQuantity * d.adultPrice) : "—"}</dd>
              <dt className="flex items-center gap-2 text-ink-soft">
                <Ticket className="size-4" aria-hidden="true" /> Trẻ em × {booking.childQuantity}
              </dt>
              <dd className="text-right">{d ? formatVnd(booking.childQuantity * d.childPrice) : "—"}</dd>
              <dt className="border-t border-line pt-3 font-semibold">Tổng tiền</dt>
              <dd className="border-t border-line pt-3 text-right font-heading text-xl font-bold text-cta">{formatVnd(booking.totalPrice)}</dd>
              <dt className="text-ink-soft">Ngày đặt</dt>
              <dd className="text-right">{formatDateTime(booking.bookedAt)}</dd>
              {booking.paymentStatus && (
                <>
                  <dt className="text-ink-soft">Thanh toán</dt>
                  <dd className="text-right">
                    <PaymentStatusBadge status={booking.paymentStatus} />
                  </dd>
                </>
              )}
            </dl>
          </Card>

          {booking.status === "CANCELLED" && (
            <Alert tone="warning" title="Đơn đã huỷ">
              {booking.cancelledAt && <>Huỷ lúc {formatDateTime(booking.cancelledAt)}. </>}
              {booking.cancelReason && <>Lý do: {booking.cancelReason}</>}
            </Alert>
          )}
          {booking.status === "EXPIRED" && (
            <Alert tone="warning" title="Đơn đã hết hạn">
              Đơn không được thanh toán đúng hạn nên chỗ đã được trả lại. Bạn có thể đặt lại nếu đợt còn chỗ.
            </Alert>
          )}

          {booking.canReview && !reviewed && (
            <Card>
              <h2 className="text-lg font-bold">Đánh giá chuyến đi</h2>
              <p className="mb-4 mt-1 text-sm text-ink-soft">Chia sẻ trải nghiệm để giúp những du khách khác.</p>
              <ReviewForm
                bookingId={booking.id}
                onDone={() => {
                  setReviewed(true);
                  setNotice("Cảm ơn bạn đã gửi đánh giá!");
                  void q.reload();
                }}
              />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {(booking.canPay || booking.canCancel) && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Thao tác</h2>
              {booking.canPay && booking.expiresAt && <Countdown expiresAt={booking.expiresAt} onExpire={onExpire} />}
              {booking.canPay && (
                <Button variant="cta" size="lg" onClick={() => startPayment(booking)} loading={pay.pending}>
                  <CreditCard className="size-5" aria-hidden="true" /> Thanh toán
                </Button>
              )}
              {booking.canCancel && (
                <Button variant="secondary" onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-5" aria-hidden="true" /> Huỷ đặt tour
                </Button>
              )}
            </Card>
          )}
          {booking.bill && <BillCard bill={booking.bill} />}
        </div>
      </div>

      {booking.canCancel && (
        <CancelBookingDialog
          booking={booking}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onCancelled={(b) => {
            q.setData(b);
            setNotice("Đã huỷ đơn đặt tour.");
            void q.reload();
          }}
        />
      )}
    </div>
  );
}
