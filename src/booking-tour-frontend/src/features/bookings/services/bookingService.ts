import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type { BookingDto, BookingStatus, DepartureDto, PaymentDto, ReviewDto, TourDetailDto } from "@/types/domain";

export interface CreateBookingPayload {
  departureId: number;
  adultQuantity: number;
  childQuantity: number;
}

export const bookingService = {
  departure: (id: number | string) => api.get<DepartureDto>(`/departures/${id}`, undefined, { auth: false }),
  tour: (id: number | string) => api.get<TourDetailDto>(`/tours/${id}`),
  create: (payload: CreateBookingPayload) => api.post<BookingDto>("/bookings", payload),
  mine: (status: BookingStatus | undefined, page: number, size = 10) =>
    api.get<PageResponse<BookingDto>>("/users/me/bookings", { status, page, size }),
  get: (id: number | string) => api.get<BookingDto>(`/bookings/${id}`),
  cancel: (id: number, reason?: string) => api.post<BookingDto>(`/bookings/${id}/cancel`, { reason: reason || undefined }),
  startPayment: (id: number) => api.post<PaymentDto>(`/bookings/${id}/payment`),
  review: (payload: { bookingId: number; rating: number; content: string }) => api.post<ReviewDto>("/reviews", payload),
};

/** Tổng tiền = NL × giá NL + TE × giá TE. */
export function calcBookingTotal(adults: number, children: number, adultPrice: number, childPrice: number): number {
  return Math.max(0, adults) * adultPrice + Math.max(0, children) * childPrice;
}
