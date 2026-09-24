import { serverGet } from "@/lib/api/server";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/env";
import type { PageResponse } from "@/types/api";
import type { CategoryDto, ReviewDto, TourDetailDto, TourSummaryDto } from "@/types/domain";
import type { TourSearchParams } from "../types";

/** Gọi từ Server Component (trang công khai). */
export const tourServer = {
  search: (p: TourSearchParams, size = DEFAULT_PAGE_SIZE) =>
    serverGet<PageResponse<TourSummaryDto>>("/tours", {
      keyword: p.keyword,
      categoryId: p.categoryId,
      minPrice: p.minPrice,
      maxPrice: p.maxPrice,
      departFrom: p.departFrom,
      departTo: p.departTo,
      sort: p.sort,
      page: p.page ?? 0,
      size,
    }),
  detail: (id: string | number) => serverGet<TourDetailDto>(`/tours/${id}`),
  categories: () => serverGet<CategoryDto[]>("/categories"),
  reviews: (tourId: string | number, page = 0, size = 5) =>
    serverGet<PageResponse<ReviewDto>>(`/tours/${tourId}/reviews`, { page, size }),
};
