/** DTO theo hợp đồng API §3. */
export type Role = "CUSTOMER" | "TOUR_GUIDE" | "TOUR_MANAGER" | "ADMIN";
export type TourStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type DepartureStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
export type ReviewStatus = "VISIBLE" | "HIDDEN";

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface CategoryDto {
  id: number;
  name: string;
  tourCount?: number;
}

export interface PlaceDto {
  id: number;
  name: string;
  description?: string;
}

export interface ItineraryItemDto {
  id: number;
  placeId: number;
  placeName: string;
  placeDescription?: string;
  displayOrder: number;
}

export interface TourImageDto {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

export interface TourSummaryDto {
  id: number;
  tourCode: string;
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  fromPrice: number;
  coverImageUrl?: string;
  categoryId: number;
  categoryName: string;
  status: TourStatus;
  nextDepartureAt?: string;
  openDepartureCount: number;
  availableSeats: number;
  ratingAverage?: number;
  ratingCount: number;
}

export interface DepartureDto {
  id: number;
  tourId: number;
  tourTitle: string;
  startAt: string;
  endAt: string;
  capacity: number;
  bookedSeats: number;
  availableSeats: number;
  adultPrice: number;
  childPrice: number;
  status: DepartureStatus;
  tourGuideId?: number;
  tourGuideName?: string;
}

export interface TourDetailDto extends TourSummaryDto {
  description: string;
  maxGuests: number;
  images: TourImageDto[];
  itinerary: ItineraryItemDto[];
  departures: DepartureDto[];
}

export interface PaymentDto {
  id: number;
  bookingId: number;
  bookingCode: string;
  amount: number;
  status: PaymentStatus;
  provider: "MOCK" | "STRIPE";
  transactionCode?: string;
  paymentMethod?: string;
  createdAt: string;
  paidAt?: string;
  checkoutUrl?: string;
  customerName?: string;
}

export interface BillDto {
  id: number;
  billCode: string;
  amount: number;
  createdAt: string;
  payments: PaymentDto[];
}

export interface BookingDto {
  id: number;
  bookingCode: string;
  status: BookingStatus;
  adultQuantity: number;
  childQuantity: number;
  ticketQuantity: number;
  totalPrice: number;
  bookedAt: string;
  expiresAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  departure: DepartureDto;
  tourId: number;
  tourTitle: string;
  tourCoverImageUrl?: string;
  customer: { id: number; fullName: string; email: string; phone?: string };
  paymentStatus?: PaymentStatus;
  bill?: BillDto;
  canPay: boolean;
  canCancel: boolean;
  canReview: boolean;
  refundPreview?: { percent: number; amount: number };
}

export interface ReviewDto {
  id: number;
  bookingId: number;
  tourId: number;
  userId: number;
  userName: string;
  rating: number;
  content: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface NotificationDto {
  id: number;
  title: string;
  content: string;
  bookingId?: number;
  read: boolean;
  createdAt: string;
}

export interface GuidePassenger {
  bookingCode: string;
  fullName: string;
  phone?: string;
  adultQuantity: number;
  childQuantity: number;
  status: BookingStatus;
}

export interface GuideDepartureDetail {
  departure: DepartureDto;
  tourTitle: string;
  passengers: GuidePassenger[];
}

export interface SettingDto {
  key: string;
  value: string;
  description?: string;
}

export interface AuditLogDto {
  id: number;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string | number;
  result?: string;
  detail?: string;
  createdAt: string;
}

export interface DashboardDto {
  tours: { total: number; active: number };
  departures: { upcoming: number; inProgress: number };
  bookings: Record<BookingStatus, number>;
  revenue: { paid: number; refunded: number };
  users: { total: number; customers: number };
  recentBookings: BookingDto[];
}

export interface DemoClockDto {
  now: string;
  offsetMinutes: number;
}
