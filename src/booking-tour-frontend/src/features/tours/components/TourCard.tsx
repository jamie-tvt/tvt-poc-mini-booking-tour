import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { TourImage } from "@/components/shared/TourImage";
import { Stars } from "@/components/ui/Stars";
import { formatDate, formatDuration, formatVnd } from "@/lib/utils/format";
import type { TourSummaryDto } from "@/types/domain";

export function TourCard({ tour, priority }: { tour: TourSummaryDto; priority?: boolean }) {
  const soldOut = tour.openDepartureCount === 0 || tour.availableSeats === 0;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card transition-shadow duration-200 hover:shadow-pop focus-within:shadow-pop">
      <div className="relative">
        <TourImage src={tour.coverImageUrl} alt="" priority={priority} />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-ink shadow-sm">
          {tour.categoryName}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg font-bold leading-snug">
          <Link
            href={`/tours/${tour.id}`}
            className="rounded-sm text-ink after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
          >
            {tour.title}
          </Link>
        </h3>
        <ul className="grid grid-cols-1 gap-1.5 text-sm text-ink-soft sm:grid-cols-2">
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">{tour.destination}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {formatDuration(tour.durationDays)}
          </li>
          <li className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {tour.nextDepartureAt ? <>Khởi hành {formatDate(tour.nextDepartureAt)}</> : "Chưa có lịch"}
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {soldOut ? "Hết chỗ" : `Còn ${tour.availableSeats} chỗ`}
          </li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
          <Stars value={tour.ratingAverage} count={tour.ratingCount} />
          <p className="text-right">
            <span className="block text-xs text-ink-soft">Giá từ</span>
            <span className="font-heading text-lg font-bold text-cta">{formatVnd(tour.fromPrice ?? tour.price)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function TourGrid({ tours }: { tours: TourSummaryDto[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tours.map((t, i) => (
        <li key={t.id} className="flex">
          <div className="w-full">
            <TourCard tour={t} priority={i < 3} />
          </div>
        </li>
      ))}
    </ul>
  );
}
