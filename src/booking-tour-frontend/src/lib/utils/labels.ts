import type { BookingStatus, DepartureStatus, PaymentStatus, Role, TourStatus } from "@/types/domain";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Khách hàng",
  TOUR_GUIDE: "Hướng dẫn viên",
  TOUR_MANAGER: "Quản lý tour",
  ADMIN: "Quản trị viên",
};

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ thanh toán", tone: "warning" },
  CONFIRMED: { label: "Đã xác nhận", tone: "info" },
  COMPLETED: { label: "Đã hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
  EXPIRED: { label: "Hết hạn", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ thanh toán", tone: "warning" },
  PAID: { label: "Đã thanh toán", tone: "success" },
  FAILED: { label: "Thất bại", tone: "danger" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "info" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral" },
};

export const DEPARTURE_STATUS: Record<DepartureStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Đang mở bán", tone: "info" },
  IN_PROGRESS: { label: "Đang diễn ra", tone: "warning" },
  COMPLETED: { label: "Đã hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
};

export const TOUR_STATUS: Record<TourStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  ACTIVE: { label: "Đang hoạt động", tone: "success" },
  INACTIVE: { label: "Ngừng hoạt động", tone: "danger" },
};

export const ROLES: Role[] = ["CUSTOMER", "TOUR_GUIDE", "TOUR_MANAGER", "ADMIN"];
export const BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];
export const TOUR_STATUSES: TourStatus[] = ["DRAFT", "ACTIVE", "INACTIVE"];

export const TOUR_SORT_OPTIONS = [
  { value: "nextDeparture", label: "Khởi hành sớm nhất" },
  { value: "price,asc", label: "Giá thấp đến cao" },
  { value: "price,desc", label: "Giá cao đến thấp" },
  { value: "newest", label: "Mới nhất" },
] as const;
