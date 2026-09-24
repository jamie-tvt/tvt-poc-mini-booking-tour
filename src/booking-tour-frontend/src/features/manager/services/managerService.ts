import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type {
  BookingDto,
  BookingStatus,
  CategoryDto,
  DepartureDto,
  ItineraryItemDto,
  PlaceDto,
  TourDetailDto,
  TourImageDto,
  TourStatus,
  TourSummaryDto,
  UserDto,
} from "@/types/domain";

export interface TourPayload {
  tourCode: string;
  title: string;
  description: string;
  destination: string;
  durationDays: number;
  maxGuests: number;
  price: number;
  categoryId: number;
  coverImageUrl?: string;
  status: TourStatus;
}

export interface DeparturePayload {
  startAt: string;
  endAt: string;
  capacity: number;
  adultPrice?: number;
  childPrice?: number;
  tourGuideId?: number;
}

export const managerService = {
  // Tour
  tours: (q: { keyword?: string; status?: string; page: number; size?: number }) =>
    api.get<PageResponse<TourSummaryDto>>("/manager/tours", { ...q, size: q.size ?? 10 }),
  tour: (id: number | string) => api.get<TourDetailDto>(`/tours/${id}`),
  createTour: (p: TourPayload) => api.post<TourDetailDto>("/tours", p),
  updateTour: (id: number, p: TourPayload) => api.put<TourDetailDto>(`/tours/${id}`, p),
  deleteTour: (id: number) => api.del<{ deleted: boolean; status?: TourStatus } | null>(`/tours/${id}`),

  // Lịch trình & ảnh
  saveItinerary: (tourId: number, placeIds: number[]) =>
    api.put<ItineraryItemDto[]>(`/tours/${tourId}/itinerary`, {
      items: placeIds.map((placeId, i) => ({ placeId, displayOrder: i + 1 })),
    }),
  itinerary: (tourId: number) => api.get<ItineraryItemDto[]>(`/tours/${tourId}/itinerary`),
  images: (tourId: number) => api.get<TourImageDto[]>(`/tours/${tourId}/images`),
  addImage: (tourId: number, imageUrl: string) => api.post<TourImageDto>(`/tours/${tourId}/images`, { imageUrl }),
  deleteImage: (tourId: number, imageId: number) => api.del<unknown>(`/tours/${tourId}/images/${imageId}`),

  // Đợt khởi hành
  departures: (tourId: number) => api.get<DepartureDto[]>(`/tours/${tourId}/departures`, { all: true }),
  createDeparture: (tourId: number, p: DeparturePayload) => api.post<DepartureDto>(`/tours/${tourId}/departures`, p),
  updateDeparture: (id: number, p: DeparturePayload) => api.put<DepartureDto>(`/departures/${id}`, p),
  cancelDeparture: (id: number, reason: string) => api.put<DepartureDto>(`/departures/${id}/cancel`, { reason }),
  guides: () => api.get<UserDto[]>("/guides"),

  // Danh mục & địa điểm
  categories: () => api.get<CategoryDto[]>("/categories"),
  createCategory: (p: { name: string }) => api.post<CategoryDto>("/categories", p),
  updateCategory: (id: number, p: { name: string }) => api.put<CategoryDto>(`/categories/${id}`, p),
  deleteCategory: (id: number) => api.del<unknown>(`/categories/${id}`),
  places: () => api.get<PlaceDto[]>("/places"),
  createPlace: (p: { name: string; description?: string }) => api.post<PlaceDto>("/places", p),
  updatePlace: (id: number, p: { name: string; description?: string }) => api.put<PlaceDto>(`/places/${id}`, p),
  deletePlace: (id: number) => api.del<unknown>(`/places/${id}`),

  // Đơn (Staff)
  bookings: (q: { status?: BookingStatus; keyword?: string; departureId?: number; page: number; size?: number }) =>
    api.get<PageResponse<BookingDto>>("/admin/bookings", { ...q, size: q.size ?? 10 }),
  booking: (id: number | string) => api.get<BookingDto>(`/bookings/${id}`),
  adminCancelBooking: (id: number, reason: string) =>
    api.put<BookingDto>(`/admin/bookings/${id}/status`, { status: "CANCELLED", reason }),
};
