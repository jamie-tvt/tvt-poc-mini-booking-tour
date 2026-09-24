import Link from "next/link";
import { CalendarDays, Ticket } from "lucide-react";
import { TourImage } from "@/components/shared/TourImage";
import { formatDateRange, formatVnd } from "@/lib/utils/format";
import type { BookingDto } from "@/types/domain";
import { BookingStatusBadge } from "./BookingStatusBadge";

export function BookingCard({ booking }: { booking: BookingDto }) {
  return (
    <article className="relative flex flex-col gap-4 rounded-xl border border-line bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-pop sm:flex-row">
      <div className="sm:w-40 sm:shrink-0">
        <TourImage src={booking.tourCoverImageUrl} alt="" className="rounded-lg" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-ink">{booking.bookingCode}</span>
          <BookingStatusBadge status={booking.status} />
        </div>
        <h2 className="text-lg font-bold leading-snug">
          <Link href={`/bookings/${booking.id}`} className="rounded-sm after:absolute after:inset-0 hover:text-brand">
            {booking.tourTitle}
          </Link>
        </h2>
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <CalendarDays className="size-4 text-brand" aria-hidden="true" />
          {formatDateRange(booking.departure?.startAt, booking.departure?.endAt)}
        </p>
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Ticket className="size-4 text-brand" aria-hidden="true" />
          {booking.adultQuantity} người lớn{booking.childQuantity > 0 ? `, ${booking.childQuantity} trẻ em` : ""}
        </p>
      </div>
      <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end">
        <span className="text-xs text-ink-soft">Tổng tiền</span>
        <span className="font-heading text-lg font-bold text-cta">{formatVnd(booking.totalPrice)}</span>
      </div>
    </article>
  );
}
