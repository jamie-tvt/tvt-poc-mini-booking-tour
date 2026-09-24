---
id: technical.api-contracts
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [technical.data-model, technical.state-machine]
code_ref: [src/booking-tour-backend/src/main/java/com/tourbooking/presentation]
tags: [technical, api, contract]
---

# Hợp đồng API — Booking Tour (POC mentor)

Bám **API Documentation v1.0 của Team A** (base `/api/v1`, JWT Bearer + refresh rotation, `ApiResponse`, mã lỗi). Chỗ nào khác tài liệu intern thì ghi "≠ intern" kèm lý do. Swagger chạy ở `http://localhost:8080/docs`.

## 1. Quy ước chung
- Base URL: `http://localhost:8080/api/v1`. JSON UTF-8. Thời gian ISO 8601 (`2026-10-05T07:00:00Z`, UTC). Tiền là số nguyên VND.
- Enum: `UPPER_SNAKE_CASE`.
- Xác thực: `Authorization: Bearer <accessToken>`.
- Phân trang: query `page` (0-based), `size` (mặc định 12, tối đa 100), `sort`. Trả về `PageResponse`.

### ApiResponse (mọi response, kể cả lỗi)
```json
{ "success": true, "status": 200, "code": "SUCCESS", "message": "OK",
  "requestId": "8fcde0bc-...", "timestamp": "2026-09-23T08:53:28Z",
  "data": { }, "errors": null }
```
Lỗi validation: `status 400, code "VALIDATION_FAILED", errors: [{ "field": "email", "message": "..." }]`.

### PageResponse (nằm trong `data`)
`{ "content": [...], "page": 0, "size": 12, "totalElements": 31, "totalPages": 3 }`

### Mã lỗi (`code`)
| HTTP | code | Khi nào |
|---|---|---|
| 400 | VALIDATION_FAILED, BAD_REQUEST | Sai định dạng / thiếu trường |
| 401 | UNAUTHORIZED, INVALID_CREDENTIALS, TOKEN_EXPIRED, INVALID_REFRESH_TOKEN, INVALID_SIGNATURE | Chưa đăng nhập, sai mật khẩu, token hỏng, webhook sai chữ ký |
| 403 | ACCESS_DENIED, ACCOUNT_DISABLED | Sai vai trò, tài khoản bị khoá |
| 404 | NOT_FOUND | Không có tài nguyên |
| 409 | CONFLICT, DEPARTURE_FULL, INVALID_TRANSITION, EMAIL_EXISTS, DUPLICATE_CODE, ALREADY_REVIEWED | Xung đột trạng thái |
| 422 | BUSINESS_RULE | Đúng định dạng nhưng vi phạm quy tắc (VD đợt không OPEN, chưa hoàn thành tour) |
| 500 | INTERNAL_ERROR | Lỗi không lường trước |

## 2. Vai trò
`CUSTOMER`, `TOUR_GUIDE`, `TOUR_MANAGER`, `ADMIN`. "Staff" = `TOUR_MANAGER` hoặc `ADMIN`.

## 3. Kiểu dữ liệu (DTO)
```ts
type Role = "CUSTOMER" | "TOUR_GUIDE" | "TOUR_MANAGER" | "ADMIN";
type TourStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
type DepartureStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

interface UserDto { id: number; fullName: string; email: string; phone?: string; address?: string; role: Role; active: boolean; createdAt: string; }
interface AuthTokens { accessToken: string; refreshToken: string; expiresIn: number; /* giây */ user: UserDto; }

interface CategoryDto { id: number; name: string; tourCount?: number; }
interface PlaceDto { id: number; name: string; description?: string; }
interface ItineraryItemDto { id: number; placeId: number; placeName: string; placeDescription?: string; displayOrder: number; }
interface TourImageDto { id: number; imageUrl: string; sortOrder: number; }

interface TourSummaryDto {           // danh sách
  id: number; tourCode: string; title: string; destination: string; durationDays: number;
  price: number;                     // giá gốc của tour (người lớn)
  fromPrice: number;                 // giá thấp nhất trong các đợt OPEN còn chỗ, = price nếu không có
  coverImageUrl?: string; categoryId: number; categoryName: string; status: TourStatus;
  nextDepartureAt?: string; openDepartureCount: number; availableSeats: number;
  ratingAverage?: number; ratingCount: number;
}
interface TourDetailDto extends TourSummaryDto {
  description: string; maxGuests: number;
  images: TourImageDto[]; itinerary: ItineraryItemDto[];
  departures: DepartureDto[];        // public: chỉ OPEN, start_at > now
}
interface DepartureDto {
  id: number; tourId: number; tourTitle: string; startAt: string; endAt: string;
  capacity: number; bookedSeats: number; availableSeats: number;
  adultPrice: number; childPrice: number; status: DepartureStatus;
  tourGuideId?: number; tourGuideName?: string;
}
interface BookingDto {
  id: number; bookingCode: string;   // VD "BT-7K3F9Q"
  status: BookingStatus; adultQuantity: number; childQuantity: number; ticketQuantity: number;
  totalPrice: number; bookedAt: string; expiresAt?: string; cancelledAt?: string; cancelReason?: string;
  departure: DepartureDto; tourId: number; tourTitle: string; tourCoverImageUrl?: string;
  customer: { id: number; fullName: string; email: string; phone?: string };
  paymentStatus?: PaymentStatus; bill?: BillDto;
  canPay: boolean; canCancel: boolean; canReview: boolean;
  refundPreview?: { percent: number; amount: number };   // khi canCancel
}
interface BillDto { id: number; billCode: string; amount: number; createdAt: string; payments: PaymentDto[]; }
interface PaymentDto { id: number; bookingId: number; bookingCode: string; amount: number; status: PaymentStatus; provider: "MOCK" | "STRIPE"; transactionCode?: string; paymentMethod?: string; createdAt: string; paidAt?: string; checkoutUrl?: string; customerName?: string; }
interface ReviewDto { id: number; bookingId: number; tourId: number; userId: number; userName: string; rating: number; content: string; status: "VISIBLE" | "HIDDEN"; createdAt: string; }
interface NotificationDto { id: number; title: string; content: string; bookingId?: number; read: boolean; createdAt: string; }
```

## 4. Endpoint

### 4.1 Xác thực (public trừ khi ghi khác)
| Method | Path | Body → data |
|---|---|---|
| POST | `/auth/register` | `{fullName, email, password (≥8), confirmPassword, phone?}` → `UserDto` (201). Không tự đăng nhập (SRS UC-AUTH-01) |
| POST | `/auth/login` | `{email, password}` → `AuthTokens` |
| POST | `/auth/refresh` | `{refreshToken}` → `AuthTokens` (token cũ bị thu hồi; dùng lại token cũ → 401 và thu hồi mọi phiên) |
| POST | `/auth/logout` | `{refreshToken}` → null |
| GET | `/users/me` | 🔒 → `UserDto` |
| PUT | `/users/me` | 🔒 `{fullName, phone?, address?}` → `UserDto` |

### 4.2 Tour, danh mục, địa điểm
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/tours?keyword&categoryId&minPrice&maxPrice&departFrom&departTo&page&size&sort` | public | Chỉ `ACTIVE`. `sort`: `price,asc` \| `price,desc` \| `nextDeparture` \| `newest`. → `PageResponse<TourSummaryDto>` |
| GET | `/tours/{id}` | public | `TourDetailDto`; tour không ACTIVE → 404 với public, staff xem được |
| GET | `/manager/tours?keyword&status&page&size` | Staff | Mọi trạng thái (≠ intern: tách endpoint quản trị) |
| POST | `/tours` | Staff | `{tourCode, title, description, destination, durationDays, maxGuests, price, categoryId, coverImageUrl?, status}` → `TourDetailDto` |
| PUT | `/tours/{id}` | Staff | như POST |
| DELETE | `/tours/{id}` | Staff | Chưa có đợt → xoá; đã có đợt/booking → chuyển `INACTIVE`, trả `{deleted:false, status:"INACTIVE"}` |
| GET | `/tours/{id}/itinerary` | public | `ItineraryItemDto[]` |
| PUT | `/tours/{id}/itinerary` | Staff | `{items:[{placeId, displayOrder}]}` thay cả danh sách (≠ intern: gộp POST/PUT từng mục) |
| GET/POST | `/tours/{id}/images` | public / Staff | POST `{imageUrl}` |
| DELETE | `/tours/{id}/images/{imageId}` | Staff | |
| GET | `/categories` | public | `CategoryDto[]` |
| POST/PUT/DELETE | `/categories`, `/categories/{id}` | Staff | `{name}`; xoá danh mục còn tour → 409 |
| GET | `/places` | public | `PlaceDto[]` |
| POST/PUT/DELETE | `/places`, `/places/{id}` | Staff | `{name, description?}` |

### 4.3 Đợt khởi hành
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/tours/{tourId}/departures?all=false` | public (all=true: Staff) | |
| GET | `/departures/{id}` | public | |
| POST | `/tours/{tourId}/departures` | Staff | `{startAt, endAt, capacity, adultPrice?, childPrice?, tourGuideId?}` — giá bỏ trống lấy giá tour, trẻ em = 70% (setting `pricing.child_percent`) |
| PUT | `/departures/{id}` | Staff | như POST; đã có booking thì không đổi `startAt` và `capacity` không nhỏ hơn `bookedSeats` (422). Phân công HDV trùng lịch → 409 |
| PUT | `/departures/{id}/cancel` | Staff | `{reason}` → huỷ đợt, huỷ mọi booking PENDING/CONFIRMED, payment PAID → REFUNDED 100%, gửi thông báo |
| GET | `/guides` | Staff | `UserDto[]` vai trò TOUR_GUIDE |

### 4.4 Đặt tour
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| POST | `/bookings` | CUSTOMER | `{departureId, adultQuantity ≥1, childQuantity ≥0}` → `BookingDto` 201 (`PENDING`, `expiresAt` = now + `booking.payment_timeout_minutes`). Hết chỗ → 409 `DEPARTURE_FULL`; đợt không OPEN / đã khởi hành → 422 |
| GET | `/users/me/bookings?status&page&size` | 🔒 | `PageResponse<BookingDto>` |
| GET | `/bookings/{id}` | chủ booking hoặc Staff | `BookingDto` |
| POST | `/bookings/{id}/cancel` | chủ booking | `{reason?}` → `BookingDto`. PENDING: huỷ không mất tiền. CONFIRMED: hoàn theo chính sách (≥7 ngày 100%, 3–6 ngày 50%, <3 ngày 0% — settings) |
| GET | `/admin/bookings?status&keyword&departureId&page&size` | Staff | `PageResponse<BookingDto>` |
| PUT | `/admin/bookings/{id}/status` | ADMIN | `{status:"CANCELLED", reason}` — chỉ cho huỷ (≠ intern: không cho sửa tuỳ ý trạng thái) |
| GET | `/bookings/{id}/bill` | chủ booking hoặc Staff | `BillDto` |

### 4.5 Thanh toán
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| POST | `/bookings/{bookingId}/payment` | chủ booking | Tạo payment `PENDING` (hoặc trả lại payment PENDING đang có) → `PaymentDto` có `checkoutUrl`. Với cổng giả lập: `checkoutUrl = {FRONTEND_URL}/pay/mock/{paymentId}` |
| GET | `/payments/{id}` | chủ hoặc Staff | `PaymentDto` |
| POST | `/payments/mock/{id}/complete` | chủ payment | `{result:"SUCCESS"\|"FAILED"}` — **trang cổng giả lập** gọi; server tự ký HMAC rồi chạy đúng đường xử lý webhook |
| POST | `/payments/webhook/mock` | public, header `X-Mock-Signature: <hex HMAC-SHA256(body, MOCK_GATEWAY_SECRET)>` | body `{eventId, paymentId, transactionCode, result, amount}`; sai chữ ký → 401; gửi lại cùng `transactionCode` → 200 không xử lý lại |
| POST | `/payments/stripe/webhook` | public, header `Stripe-Signature` | Chỉ khi `PAYMENT_PROVIDER=stripe` |
| GET | `/admin/payments?status&page&size` | ADMIN | `PageResponse<PaymentDto>` |
| POST | `/payments/{id}/verify` | ADMIN | PENDING → PAID thủ công (SRS 7.7) |
| POST | `/payments/{id}/refund` | ADMIN | PAID → REFUNDED |
| POST | `/payments/{id}/cancel` | ADMIN | PENDING → CANCELLED |

### 4.6 Đánh giá, thông báo
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/tours/{tourId}/reviews?page&size` | public | chỉ `VISIBLE` |
| POST | `/reviews` | CUSTOMER | `{bookingId, rating 1..5, content ≥10 ký tự}`; booking phải `COMPLETED` và của mình (422); đã đánh giá → 409 `ALREADY_REVIEWED` |
| GET | `/admin/reviews?page&size` | Staff | mọi trạng thái |
| PUT | `/admin/reviews/{id}/visibility` | Staff | `{status:"VISIBLE"\|"HIDDEN"}` |
| GET | `/notifications?page&size` | 🔒 | `PageResponse<NotificationDto>` |
| GET | `/notifications/unread-count` | 🔒 | `{count}` |
| PUT | `/notifications/{id}/read`, `/notifications/read-all` | 🔒 | (≠ intern: read-all dùng PUT thay GET vì có thay đổi dữ liệu) |

### 4.7 Hướng dẫn viên
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/guide/departures?status` | TOUR_GUIDE | đợt được phân công |
| GET | `/guide/departures/{id}` | TOUR_GUIDE được phân công | `{departure: DepartureDto, tourTitle, passengers:[{bookingCode, fullName, phone, adultQuantity, childQuantity, status}]}` — chỉ booking CONFIRMED/COMPLETED; không trả email |
| POST | `/guide/departures/{id}/start` | như trên | OPEN → IN_PROGRESS (chỉ khi `now ≥ startAt - 1 ngày`); booking PENDING → EXPIRED |
| POST | `/guide/departures/{id}/finish` | như trên | IN_PROGRESS → COMPLETED; booking CONFIRMED → COMPLETED, gửi thông báo mời đánh giá |

### 4.8 Quản trị
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/admin/users?keyword&role&page&size` | ADMIN | |
| POST | `/admin/users` | ADMIN | `{fullName, email, password, phone?, role}` |
| PUT | `/admin/users/{id}` | ADMIN | `{fullName, phone?, role}` — không được hạ quyền chính mình |
| PUT | `/admin/users/{id}/active` | ADMIN | `{active}`; khoá thì thu hồi refresh token |
| GET | `/admin/settings` | ADMIN | `[{key, value, description}]` |
| PUT | `/admin/settings` | ADMIN | `{items:[{key, value}]}` |
| GET | `/admin/dashboard` | Staff | `{tours:{total, active}, departures:{upcoming, inProgress}, bookings:{PENDING, CONFIRMED, COMPLETED, CANCELLED, EXPIRED}, revenue:{paid, refunded}, users:{total, customers}, recentBookings: BookingDto[]}` |
| GET | `/admin/audit-logs?page&size` | ADMIN | `[{id, userEmail, action, entityType, entityId, result, detail, createdAt}]` |

### 4.9 Công cụ demo (chỉ khi `DEMO_TOOLS=true`)
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/demo/clock` | public | `{now, offsetMinutes}` |
| POST | `/demo/clock` | ADMIN | `{offsetMinutes}` — dời đồng hồ nghiệp vụ để demo hết hạn thanh toán, khởi hành |
| POST | `/demo/expire-now` | ADMIN | chạy ngay job hết hạn |

## 5. Tài khoản mẫu (seed, mật khẩu `12345678` — giống Mockup UI của intern)
| Vai trò | Email |
|---|---|
| CUSTOMER | customer@example.com (Nguyễn Văn Hào, có sẵn đơn), mai.tran@example.com |
| TOUR_GUIDE | guide@example.com (Trần Quốc Hưng), tuan.guide@example.com |
| TOUR_MANAGER | manager@example.com (Nguyễn Thu Hà) |
| ADMIN | admin@example.com (Lê Hoàng Long) |
