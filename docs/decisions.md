---
id: decisions
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [constraints]
tags: [governance, adr, gate]
---

# Quyết định

| # | Ngày | Quyết định | Lý do | Người duyệt |
|---|---|---|---|---|
| D1 | 23/09/2026 | POC full-stack khớp stack intern (Spring Boot 3 + Next.js + MySQL 8 + Docker) | So sánh code-to-code với bài intern | User (mentor lead) |
| D2 | 23/09/2026 | POC nội bộ, không báo giá | Mục đích đào tạo | User |
| D3 | 23/09/2026 | Mốc 1 tuần; Tour trước, Hotel sau | Kịp đầu giai đoạn code của intern | User |
| D4 | 23/09/2026 | Người duyệt Cổng 1 / GATE 1 / GATE 2: mentor lead | — | User |
| D5 | 23/09/2026 | Enum `UPPER_SNAKE_CASE`; Booking thêm `EXPIRED`; Payment thêm `FAILED` | SRS viết 5 kiểu tên khác nhau; SRS 9.9 nhắc "thất bại" nhưng thiếu trạng thái | User duyệt mặc định (Cổng 1) |
| D6 | 23/09/2026 | Hạn thanh toán 15 phút (setting), job 30 giây/lần | SRS 4.7 chỉ ghi "thời gian quy định" | như trên |
| D7 | 23/09/2026 | Huỷ ≥ 7 ngày hoàn 100%, 3–6 ngày 50%, < 3 ngày 0% (setting) | SRS 9.6 không có số | như trên |
| D8 | 23/09/2026 | Giá theo đợt (mặc định giá tour), vé trẻ em 70% | DB có `child_quantity` nhưng SRS không có giá trẻ em | như trên |
| D9 | 23/09/2026 | Tiền là `BIGINT` VND | VND không có phần lẻ, tránh sai số | Mentor |
| D10 | 23/09/2026 | Service là class cụ thể, bỏ cặp `Service` + `ServiceImpl` | Chỉ có 1 cài đặt → interface không thêm giá trị (YAGNI). Interface giữ ở chỗ có nhiều cài đặt: `PaymentGateway` | Mentor — điểm thảo luận với intern |
| D11 | 23/09/2026 | Webhook giả lập đi đúng đường xác minh chữ ký như cổng thật | Demo không cần tài khoản Stripe nhưng vẫn dạy đúng cách | Mentor |
| D12 | 23/09/2026 | HDV chỉ thấy tên, SĐT, số vé của khách (không email/địa chỉ) | Gap #22 quyền riêng tư | Mentor |
| D13 | 23/09/2026 | GATE 1 và GATE 2 được coi là duyệt theo chỉ đạo "code đi" của user ngày 23/09; test plan trình lại khi bàn giao | User yêu cầu chạy liền | User |
| D14 | 24/09/2026 | Ảnh tour dùng link CDN Unsplash (`images.unsplash.com/<photo-id>?auto=format&fit=crop&w=1200&q=75`), không tải JPG vào repo; helper `unsplashVariant` lấy đúng cỡ (thẻ 800, chi tiết 1200, nền mờ 64). SVG cũ giữ làm ảnh dự phòng khi mất mạng | Repo và file demo HTML không nặng thêm; CDN tự nén WebP/AVIF. Ghi công tác giả (Unsplash License) cạnh map URL | Mentor (BUG_REPORT F4) |
| D15 | 24/09/2026 | Thiết kế "nền mờ theo ảnh" cho khu khách: `PhotoBackdrop` (ảnh 64px + blur 48px + lớp phủ màu nền), thẻ kính `.glass`, hero ảnh thật; khu quản trị không đổi | Giữ màu/font thương hiệu, chỉ thêm lớp hiệu ứng; tôn trọng `prefers-reduced-transparency` | Mentor (F6, mockup nền ảnh mờ) |
| D16 | 24/09/2026 | Mobile (< lg): bộ lọc tour thu gọn thành ô từ khoá + "Bộ lọc (n)" + "Sắp xếp" + chip; bấm mở bottom sheet. Desktop giữ lưới 4 cột | Trước đây phải cuộn qua 7 ô lọc (~1,3 màn hình) mới thấy tour đầu tiên | Mentor (F6) |
| D17 | 24/09/2026 | Tìm từ khoá không dấu: backend đổi `đ → d` ở cả hai vế (collation `utf8mb4_unicode_ci` lo phần dấu còn lại, nhưng coi `đ ≠ d`); API giả lập dùng `fold()` tương đương | `TourSearchIT` chứng minh "dong thap" không ra "Đồng Tháp" nếu chỉ dựa vào collation | Mentor (F1) |
| D18 | 24/09/2026 | Khi lọc theo ngày, thẻ tour hiện đợt đầu tiên trong khoảng lọc (giá "từ" và tổng chỗ trống vẫn tính trên mọi đợt) | Người dùng tưởng lọc hỏng khi thấy ngày ngoài khoảng | Mentor (F2) |
| D19 | 24/09/2026 | Deploy Production chỉ khi đẩy tag release `v*` (tag đầu `v1.1.0`); commit/PR thường chỉ chạy test. Workflow do người điều phối sửa | Tránh mỗi commit đều lên Production | Mentor (F5) |
