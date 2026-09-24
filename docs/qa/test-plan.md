---
id: qa.test-plan
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [technical.api-contracts, technical.state-machine]
tags: [qa, test-plan, gate-2]
---

# Test plan — ba tầng

| Tầng | Công cụ | Chạy | Phạm vi |
|---|---|---|---|
| Unit BE | JUnit 5 | `cd src/booking-tour-backend && ./mvnw test` | State machine, chính sách hoàn tiền, quy tắc đợt khởi hành |
| Integration BE | Spring Boot Test + Testcontainers MySQL 8 | cùng lệnh (cần Docker) | API thật trên DB thật: auth, phân quyền, đồng thời, hết hạn, webhook, luồng đầu–cuối |
| Unit FE | Vitest + RTL | `cd src/booking-tour-frontend && npm test` | Định dạng, validator, api client (refresh token), component |
| E2E | Playwright (Desktop Chrome + iPhone 14 Pro) | `cd src/e2e && npx playwright test` với stack Docker đang chạy | Luồng người dùng trên trình duyệt |

## Kịch bản nghiệm thu
| Mã | Kịch bản | Tầng | Kỳ vọng |
|---|---|---|---|
| IT-01 | Đăng ký → đăng nhập → refresh → dùng lại refresh cũ | Integration | Token cũ bị từ chối, cả chuỗi bị thu hồi |
| IT-02 | Khách vào `/admin/**`, tạo danh mục; manager vào `/admin/users` | Integration | 403; manager xem được `/admin/bookings` |
| IT-03 | Khoá tài khoản khi token còn hạn | Integration | 403 `ACCOUNT_DISABLED` ngay |
| IT-04 | **10 khách đồng thời đặt 1 chỗ cuối** | Integration | Đúng 1 × 201, 9 × 409 `DEPARTURE_FULL`, `booked_seats` = 1 |
| IT-05 | Webhook sai chữ ký; gửi lại đúng sự kiện | Integration | 401 `INVALID_SIGNATURE`; lần 2 không tạo giao dịch mới |
| IT-06 | Thanh toán thất bại rồi thanh toán lại | Integration | Booking vẫn PENDING, payment mới PAID → CONFIRMED |
| IT-07 | Dời đồng hồ +16 phút, chạy job | Integration | EXPIRED, nhả chỗ, không thanh toán được nữa (422) |
| IT-08 | Huỷ đơn đã thanh toán khi còn 5 ngày | Integration | Hoàn 50%, nhả chỗ |
| IT-09 | Đặt → trả tiền → HDV khác thử bắt đầu → HDV đúng start/finish → đánh giá 2 lần | Integration | 403 với HDV khác; COMPLETED; đánh giá lần 2 `ALREADY_REVIEWED` |
| IT-10 | Phân công HDV trùng lịch | Integration | 409 |
| IT-11 | Huỷ đợt có đơn đã trả tiền | Integration | Đơn CANCELLED, hoàn 100% |
| IT-12 | Job hết hạn nhả chỗ trong lúc 6 khách khác đặt cùng đợt | Integration | `booked_seats` = tổng vé đơn PENDING/CONFIRMED |
| E2E-01 | Khách mới đăng ký → chọn đợt → +1 vé → giữ chỗ → cổng giả lập thành công → HDV bắt đầu/kết thúc → khách đánh giá 5 sao | E2E | Chạy trọn trên desktop và mobile |
| E2E-02 | Chưa đăng nhập mở `/bookings` | E2E | Chuyển `/login?next=` |
| E2E-03 | Khách mở `/admin/users` | E2E | Báo không có quyền |

## Checklist UI (Pre-Delivery của MASTER.md)
- [x] Không emoji làm icon (lucide-react)
- [x] cursor-pointer, hover 150–300ms
- [x] Tương phản chữ ≥ 4.5:1 (nút dùng #0369A1 / #C2410C thay màu gốc)
- [x] Focus nhìn thấy khi dùng bàn phím; mọi input có `<label>`
- [x] `prefers-reduced-motion`
- [x] Responsive 375 / 768 / 1024 / 1440, không tràn ngang (E2E chạy cả iPhone 14 Pro)
