---
id: technical.state-machine
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [technical.data-model]
code_ref: [src/booking-tour-backend/src/main/java/com/tourbooking/domain/booking/BookingStatus.java, src/booking-tour-backend/src/main/java/com/tourbooking/domain/departure/DepartureStatus.java, src/booking-tour-backend/src/main/java/com/tourbooking/domain/payment/PaymentStatus.java]
tags: [technical, state-machine, domain]
---

# State machine

Bảng chuyển trạng thái nằm trong chính enum (`MACHINE`); entity gọi `assertTransition` trước khi đổi. Chuyển sai → 409 `INVALID_TRANSITION`.

```mermaid
stateDiagram-v2
  [*] --> PENDING: đặt tour (giữ chỗ)
  PENDING --> CONFIRMED: webhook PAID / admin xác minh
  PENDING --> EXPIRED: quá hạn thanh toán (job)
  PENDING --> CANCELLED: khách huỷ
  CONFIRMED --> COMPLETED: HDV kết thúc tour
  CONFIRMED --> CANCELLED: khách/admin huỷ, huỷ đợt
```

Đợt khởi hành: `OPEN → IN_PROGRESS → COMPLETED`, `OPEN → CANCELLED`. Bắt đầu tour làm các booking PENDING của đợt hết hạn.
Thanh toán: `PENDING → PAID | FAILED | CANCELLED`, `PAID → REFUNDED`. Không có đường từ PAID về FAILED (SRS 9.5).
