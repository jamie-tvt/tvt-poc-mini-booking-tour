"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ShieldCheck, Users } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { TourImage } from "@/components/shared/TourImage";
import { useApiQuery } from "@/lib/api/hooks";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDateRange, formatTime, formatVnd } from "@/lib/utils/format";
import { zodFieldErrors } from "@/lib/utils/validation";
import { bookingService, calcBookingTotal } from "../services/bookingService";
import { createBookingSchema } from "../validators/bookingSchemas";
import { QuantityStepper } from "./QuantityStepper";

export function BookingForm({ tourId, departureId }: { tourId: string; departureId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fullNotice, setFullNotice] = useState(false);
  const [pending, setPending] = useState(false);

  const tourQ = useApiQuery(`tour-${tourId}`, () => bookingService.tour(tourId));
  const depQ = useApiQuery(`dep-${departureId}`, () => bookingService.departure(departureId ?? ""), !!departureId);

  if (user && user.role !== "CUSTOMER") {
    return (
      <Alert tone="warning" title="Chỉ khách hàng mới đặt được tour">
        Tài khoản của bạn có vai trò khác. Hãy đăng nhập bằng tài khoản khách hàng để đặt tour.
      </Alert>
    );
  }
  if (!departureId) {
    return (
      <ErrorState
        title="Chưa chọn đợt khởi hành"
        message="Vui lòng chọn một đợt khởi hành ở trang chi tiết tour."
        action={<LinkButton href={`/tours/${tourId}#departures`}>Chọn đợt khởi hành</LinkButton>}
      />
    );
  }
  if (tourQ.loading || depQ.loading) return <Spinner />;
  if (depQ.error || !depQ.data) {
    return <ErrorState message={depQ.error?.message} action={<LinkButton href={`/tours/${tourId}`}>Quay lại tour</LinkButton>} />;
  }

  const dep = depQ.data;
  const tour = tourQ.data;
  const seats = Math.max(0, dep.availableSeats);
  const total = calcBookingTotal(adults, children, dep.adultPrice, dep.childPrice);
  const notBookable = dep.status !== "OPEN" || seats === 0 || String(dep.tourId) !== String(tourId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFullNotice(false);
    const parsed = createBookingSchema(seats).safeParse({ departureId: dep.id, adultQuantity: adults, childQuantity: children });
    if (!parsed.success) {
      const errs = zodFieldErrors(parsed.error);
      setError(Object.values(errs)[0] ?? "Dữ liệu chưa hợp lệ.");
      return;
    }
    setPending(true);
    try {
      const booking = await bookingService.create(parsed.data);
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setPending(false);
      setError(errorMessage(err));
      if (err instanceof ApiError && (err.code === "DEPARTURE_FULL" || err.status === 422)) {
        setFullNotice(err.code === "DEPARTURE_FULL");
        await depQ.reload();
      }
    }
  }

  const maxAdults = Math.max(1, seats - children);
  const maxChildren = Math.max(0, seats - adults);

  return (
    <div>
      <Link href={`/tours/${tourId}`} className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Quay lại chi tiết tour
      </Link>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Đặt tour</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="sm:w-48 sm:shrink-0">
              <TourImage src={tour?.coverImageUrl} alt="" className="rounded-lg" />
            </div>
            <div>
              <p className="text-lg font-bold">{tour?.title ?? dep.tourTitle}</p>
              <p className="mt-1 flex items-center gap-2 text-ink-soft">
                <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                {formatDateRange(dep.startAt, dep.endAt)} · khởi hành {formatTime(dep.startAt)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-ink-soft" aria-live="polite">
                <Users className="size-4 text-brand" aria-hidden="true" />
                Còn {seats}/{dep.capacity} chỗ
              </p>
            </div>
          </div>

          <form id="booking-form" onSubmit={onSubmit} className="mt-6 flex flex-col gap-5 border-t border-line pt-6">
            <QuantityStepper
              id="adult-qty"
              label="Số vé người lớn"
              description={`${formatVnd(dep.adultPrice)} / người`}
              value={adults}
              min={1}
              max={maxAdults}
              onChange={setAdults}
            />
            <QuantityStepper
              id="child-qty"
              label="Số vé trẻ em"
              description={`${formatVnd(dep.childPrice)} / trẻ (dưới 12 tuổi)`}
              value={children}
              min={0}
              max={maxChildren}
              onChange={setChildren}
            />
          </form>
        </Card>

        <Card className="h-fit lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Tóm tắt đơn</h2>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <dt className="text-ink-soft">
              Người lớn × {adults}
            </dt>
            <dd className="text-right">{formatVnd(adults * dep.adultPrice)}</dd>
            <dt className="text-ink-soft">
              Trẻ em × {children}
            </dt>
            <dd className="text-right">{formatVnd(children * dep.childPrice)}</dd>
            <dt className="border-t border-line pt-3 font-semibold">Tổng tiền</dt>
            <dd className="border-t border-line pt-3 text-right font-heading text-2xl font-bold text-cta" aria-live="polite" data-testid="booking-total">
              {formatVnd(total)}
            </dd>
          </dl>

          {error && (
            <Alert tone="error" className="mt-4" title={fullNotice ? "Đợt khởi hành vừa hết chỗ" : undefined}>
              {error}
              {fullNotice && " Số chỗ đã được cập nhật lại."}
            </Alert>
          )}
          {notBookable && !error && (
            <Alert tone="warning" className="mt-4">
              Đợt khởi hành này hiện không nhận đặt chỗ. Vui lòng chọn đợt khác.
            </Alert>
          )}

          <Button type="submit" form="booking-form" variant="cta" size="lg" className="mt-5 w-full" loading={pending} disabled={notBookable}>
            Giữ chỗ và thanh toán
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
            <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />
            Chỗ được giữ ngay khi bạn bấm. Hoàn tất thanh toán trước khi hết thời gian giữ chỗ.
          </p>
        </Card>
      </div>
    </div>
  );
}
