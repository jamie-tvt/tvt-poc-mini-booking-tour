import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { PhotoBackdrop } from "@/components/shared/PhotoBackdrop";
import { ErrorState } from "@/components/shared/ErrorState";
import { LinkButton } from "@/components/ui/Button";
import { LinkPagination } from "@/components/ui/Pagination";
import { TourGrid } from "@/features/tours/components/TourCard";
import { TourFilters } from "@/features/tours/components/TourFilters";
import { tourServer } from "@/features/tours/services/tourServer";
import { TOUR_FILTER_KEYS, type TourSearchParams } from "@/features/tours/types";
import { errorMessage } from "@/lib/api/errors";
import { firstParam, toInt, toQueryString } from "@/lib/utils/query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Danh sách tour" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ToursPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const params: TourSearchParams = {};
  for (const k of TOUR_FILTER_KEYS) params[k] = firstParam(sp[k]);
  const page = toInt(firstParam(sp.page), 0);

  const [toursRes, catsRes] = await Promise.allSettled([
    tourServer.search({ ...params, page: String(page) }),
    tourServer.categories(),
  ]);
  const categories = catsRes.status === "fulfilled" ? catsRes.value : [];
  const filterKey = TOUR_FILTER_KEYS.map((k) => params[k] ?? "").join("|");

  const cover = toursRes.status === "fulfilled" ? toursRes.value.content[0]?.coverImageUrl : undefined;

  return (
    <div className="relative isolate">
      {/* Nền đầu trang mờ theo ảnh tour đầu tiên của kết quả, hoà dần vào màu nền trang */}
      <PhotoBackdrop src={cover} tone="page" className="bottom-auto h-[34rem]" />
      <Container className="py-6 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Danh sách tour</h1>
        <p className="mt-1 text-ink-soft">Lọc theo điểm đến, giá và ngày khởi hành phù hợp với bạn.</p>
        <div className="mt-4 sm:mt-6">
          <TourFilters key={filterKey} initial={params} categories={categories} />
        </div>

        <section className="mt-6 lg:mt-8" aria-live="polite">
          {toursRes.status === "rejected" ? (
            <ErrorState message={errorMessage(toursRes.reason, undefined)} />
          ) : toursRes.value.content.length === 0 ? (
            <EmptyState
              title="Không tìm thấy tour phù hợp"
              description="Thử bỏ bớt điều kiện lọc hoặc đổi khoảng ngày khởi hành."
              action={<LinkButton href="/tours" variant="secondary">Xoá bộ lọc</LinkButton>}
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft">
                Tìm thấy <strong className="text-ink">{toursRes.value.totalElements}</strong> tour
              </p>
              <TourGrid tours={toursRes.value.content} />
              <LinkPagination
                page={toursRes.value.page}
                totalPages={toursRes.value.totalPages}
                hrefFor={(p) => `/tours${toQueryString({ ...params, page: p || undefined })}`}
              />
            </>
          )}
        </section>
      </Container>
    </div>
  );
}
