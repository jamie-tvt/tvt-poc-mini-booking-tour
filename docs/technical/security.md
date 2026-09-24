---
id: technical.security
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [constraints]
code_ref: [src/booking-tour-backend/src/main/java/com/tourbooking/infrastructure/security, src/booking-tour-backend/src/main/java/com/tourbooking/application/auth/AuthService.java]
tags: [technical, security, privacy]
---

# Bảo mật

- **Xác thực**: access token JWT HS256 ngắn hạn; refresh token ngẫu nhiên 256 bit, DB lưu SHA-256, xoay vòng mỗi lần dùng; dùng lại token đã xoay → thu hồi cả chuỗi (phát hiện token bị đánh cắp).
- **Mỗi request đọc lại user từ DB** nên khoá tài khoản / đổi vai trò có hiệu lực ngay (SRS 9.1).
- **Phân quyền** ở URL (SecurityConfig) và method (`@PreAuthorize`); 401 khi chưa đăng nhập, 403 khi sai vai trò; `TOKEN_EXPIRED` để frontend tự refresh.
- **Webhook**: HMAC-SHA256, so sánh hằng thời gian (`MessageDigest.isEqual`); Stripe kiểm cả timestamp ±5 phút.
- **Mật khẩu**: BCrypt. Đăng nhập sai ghi audit (REQUIRES_NEW để không bị rollback).
- **Dữ liệu cá nhân**: HDV chỉ thấy tên, SĐT, số vé (D12). Log có `requestId`, không log token/mật khẩu.
- **CORS** chỉ cho `FRONTEND_URL`. CSRF tắt vì API stateless dùng Bearer, không dùng cookie.
- Chưa làm (production): rate limit đăng nhập (429 có trong API doc intern), HTTPS/WAF, xác minh email.
