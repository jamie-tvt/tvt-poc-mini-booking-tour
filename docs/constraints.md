---
id: constraints
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: []
tags: [governance, hard-rules]
---

# Luật cứng

- Không bao giờ tin trạng thái thanh toán từ trình duyệt; chỉ đổi PAID qua webhook đã xác minh chữ ký hoặc admin xác minh tay.
- Số chỗ còn lại chỉ đổi trong giao dịch đã khoá dòng đợt khởi hành; DB giữ CHECK `booked_seats <= capacity` làm lớp chặn cuối.
- Thứ tự khoá toàn hệ thống: `tour_departures` → `bookings` → `payments`. Không khoá ngược chiều.
- Trước khi khoá, chỉ lấy **id** bằng truy vấn projection; không nạp entity rồi mới `SELECT … FOR UPDATE` (Hibernate trả lại bản cũ → mất cập nhật).
- Trạng thái booking/đợt/thanh toán chỉ đổi qua state machine trong domain; chuyển sai trả 409 `INVALID_TRANSITION`.
- Phân quyền kiểm tra ở API (SecurityConfig + @PreAuthorize), không chỉ ẩn nút ở giao diện.
- Secret chỉ ở biến môi trường (`src/.env`), không commit; `JWT_SECRET` ≥ 32 byte.
- Schema chỉ đổi qua migration Flyway mới; không `ddl-auto=update`.
- Không lưu refresh token thô, không lưu dữ liệu thẻ.
- Đồng hồ demo (`DEMO_TOOLS`) phải tắt ở môi trường thật.
