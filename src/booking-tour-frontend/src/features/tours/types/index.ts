export interface TourSearchParams {
  keyword?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  departFrom?: string;
  departTo?: string;
  sort?: string;
  page?: string;
}

export const TOUR_FILTER_KEYS = ["keyword", "categoryId", "minPrice", "maxPrice", "departFrom", "departTo", "sort"] as const;
