---
id: technical.data-model
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: []
code_ref: [src/booking-tour-backend/src/main/resources/db/migration/V1__init_schema.sql, src/booking-tour-backend/src/main/resources/db/migration/V2__reference_data.sql]
tags: [technical, data-model, database]
---

# Mô hình dữ liệu

Giữ 17 bảng của Database Design v1.1 (Team A) và thêm `refresh_tokens`. Mọi chỗ khác intern có chú thích `-- ≠ intern:` ngay trong migration. Điểm chính cần chỉ cho intern:

| Chủ đề | DB Design intern | POC mentor | Vì sao |
|---|---|---|---|
| Chống oversell | "Backend transaction/business logic" | Cột `booked_seats` + khoá dòng + `CHECK (booked_seats <= capacity)` | Ràng buộc quan trọng phải có ở DB |
| Trạng thái | VARCHAR tự do | `CHECK (status IN (...))` | Chặn giá trị sai từ mọi nguồn |
| Giá | Chỉ ở `tours.price` | `adult_price`, `child_price` ở đợt | Giá thay đổi theo mùa/đợt |
| Hạn thanh toán | Không có | `bookings.expires_at` + index `(status, expires_at)` | Job quét nhanh |
| Mã khách thấy | `id` | `booking_code`, `bill_code` UNIQUE | Không lộ id tuần tự |
| Webhook trùng | `transaction_code` UNIQUE | Giữ nguyên + xử lý idempotent | — |
| Review | `booking_id` UNIQUE | Giữ nguyên, bắt lỗi thành `ALREADY_REVIEWED` | — |
| Refresh token | Không có bảng | `refresh_tokens(token_hash, family_id, revoked_at)` | API doc có refresh rotation |
| Tiền | DECIMAL | BIGINT (VND) | Không có phần lẻ |

ERD của intern: https://dbdiagram.io/d/Booking_Tour-DB-6aa8a69336f99825649407a6
