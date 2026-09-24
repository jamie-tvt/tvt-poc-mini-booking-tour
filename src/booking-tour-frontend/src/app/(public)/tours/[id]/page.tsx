import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, ChevronLeft, Clock, MapPin, Users } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { PhotoBackdrop } from "@/components/shared/PhotoBackdrop";
import { LinkPagination } from "@/components/ui/Pagination";
import { Stars } from "@/components/ui/Stars";
import { DepartureTable } from "@/features/tours/components/DepartureTable";
import { ItineraryTimeline } from "@/features/tours/components/ItineraryTimeline";
import { ReviewList } from "@/features/tours/components/ReviewList";
import { TourGallery } from "@/features/tours/components/TourGallery";
import { tourServer } from "@/features/tours/services/tourServer";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { formatDateRange, formatDuration, formatVnd } from "@/lib/utils/format";
import { firstParam, toInt } from "@/lib/utils/query";
import type { TourDetailDto } from "@/types/domain";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const tour = await tourServer.detail(id);
    return { title: tour.title, description: tour.description?.slice(0, 160) };
  } catch {
    return { title: "Chi tiết tour" };
  }
}

export default async function TourDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const sp = await searchParams;
  const reviewPage = toInt(firstParam(sp.reviewPage), 0);

  let tour: TourDetailDto;
  try {
    tour = await tourServer.detail(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <Container className="py-12">
        <ErrorState message={errorMessage(e, undefined)} />
      </Container>
    );
  }
  const reviews = await tourServer.reviews(id, reviewPage).catch(() => null);

  const departures = [...(tour.departures ?? [])].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const nextDep = departures.find((d) => d.availableSeats > 0) ?? departures[0];
  const fromPrice = formatVnd(tour.fromPrice ?? tour.price);

  return (
    <>
      {/* Đầu trang: nền mờ theo ảnh cover, gallery nổi, thông tin chính trong thẻ kính */}
      <div className="relative isolate">
        <PhotoBackdrop src={tour.coverImageUrl} tone="page" />
        <Container className="pb-6 pt-6 sm:pt-8">
          <Link href="/tours" className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
            <ChevronLeft className="size-4" aria-hidden="true" /> Quay lại danh sách tour
          </Link>

          <div className="mt-2 grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
            <TourGallery title={tour.title} cover={tour.coverImageUrl} images={tour.images ?? []} />
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <span className="pill-glass text-cta-hover">{tour.categoryName}</span>
                <span className="pill-glass">
                  <Stars value={tour.ratingAverage} count={tour.ratingCount} />
                </span>
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">{tour.title}</h1>
              <ul className="grid grid-cols-1 gap-2 text-ink-soft sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 text-brand" aria-hidden="true" /> {tour.destination}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="size-4 text-brand" aria-hidden="true" /> {formatDuration(tour.durationDays)}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="size-4 text-brand" aria-hidden="true" /> Tối đa {tour.maxGuests} khách/đợt
                </li>
                <li className="flex items-center gap-2">
                  <CalendarRange className="size-4 text-brand" aria-hidden="true" /> {tour.departures.length} đợt đang mở
                </li>
              </ul>
              <div className="glass p-4 sm:p-5">
                {nextDep && (
                  <div className="mb-3 border-b border-line/70 pb-3">
                    <p className="text-sm font-semibold text-ink">Đợt gần nhất</p>
                    <p className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 text-sm">
                      <span>{formatDateRange(nextDep.startAt, nextDep.endAt)}</span>
                      <strong>{nextDep.availableSeats > 0 ? `Còn ${nextDep.availableSeats} chỗ` : "Hết chỗ"}</strong>
                    </p>
                  </div>
                )}
                <p className="text-sm text-ink-soft">Giá từ</p>
                <p className="font-heading text-3xl font-bold text-cta">{fromPrice}</p>
                <p className="text-sm text-ink-soft">/ người lớn · Mã tour {tour.tourCode}</p>
                <a
                  href="#departures"
                  className="mt-3 hidden min-h-11 w-full items-center justify-center rounded-lg bg-cta px-4 font-semibold text-white transition-colors duration-200 hover:bg-cta-hover lg:inline-flex"
                >
                  Xem lịch khởi hành
                </a>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Mobile: thanh giá + CTA dính đáy (ẩn từ lg) */}
      <div className="sticky-cta glass fixed inset-x-0 bottom-0 z-30 flex bg-white/85 items-center justify-between gap-3 rounded-b-none rounded-t-[18px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <p className="min-w-0">
          <span className="block text-xs text-ink-soft">Giá từ</span>
          <span className="block truncate font-heading text-lg font-bold text-cta">{fromPrice}</span>
        </p>
        <a
          href="#departures"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-cta px-6 font-semibold text-white transition-colors duration-200 hover:bg-cta-hover"
        >
          Chọn đợt
        </a>
      </div>

      <Container className="pb-8">
        <div className="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-10">
            <section aria-labelledby="desc-heading">
              <h2 id="desc-heading" className="text-xl font-bold sm:text-2xl">
                Giới thiệu tour
              </h2>
              <p className="mt-3 whitespace-pre-line text-ink">{tour.description}</p>
            </section>
            <section id="departures" aria-labelledby="dep-heading" className="scroll-mt-24">
              <h2 id="dep-heading" className="mb-4 text-xl font-bold sm:text-2xl">
                Lịch khởi hành
              </h2>
              <DepartureTable tourId={tour.id} departures={departures} />
            </section>
          </div>
          <section aria-labelledby="iti-heading">
            <h2 id="iti-heading" className="mb-4 text-xl font-bold sm:text-2xl">
              Lịch trình
            </h2>
            <ItineraryTimeline items={tour.itinerary ?? []} />
          </section>
        </div>

        <section id="reviews" aria-labelledby="rev-heading" className="mt-12 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 id="rev-heading" className="text-xl font-bold sm:text-2xl">
              Đánh giá của khách
            </h2>
            <Stars value={tour.ratingAverage} count={tour.ratingCount} />
          </div>
          {reviews ? (
            <>
              <ReviewList reviews={reviews.content} />
              <LinkPagination
                label="Phân trang đánh giá"
                page={reviews.page}
                totalPages={reviews.totalPages}
                hrefFor={(p) => `/tours/${tour.id}?reviewPage=${p}#reviews`}
              />
            </>
          ) : (
            <p className="text-ink-soft">Chưa tải được đánh giá.</p>
          )}
        </section>
      </Container>
    </>
  );
}
