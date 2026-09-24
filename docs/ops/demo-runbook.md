---
id: ops.demo-runbook
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [technical.architecture]
code_ref: [src/docker-compose.yml, src/.env.example, src/booking-tour-frontend/offline-demo]
tags: [ops, demo, runbook]
---

# Runbook demo

## Cách nhanh: 1 file HTML, không cần Docker
Mở `review-html/BookingTour_Demo.html` bằng Chrome/Edge/Safari (bấm đúp là chạy, không cần mạng — có mạng thì tải thêm font).
- Là **chính giao diện Next.js** trong `src/booking-tour-frontend/src`, build bằng Vite; backend được thay bằng API giả lập trong trình duyệt (`offline-demo/mock/`) bám hợp đồng API và nghiệp vụ của các `*Service.java`, cùng dữ liệu mẫu với `DemoDataSeeder`.
- Dữ liệu lưu ở localStorage của trình duyệt đang mở; mở 2 tab cùng file thì dùng chung dữ liệu (demo được "tranh chỗ cuối"). Nút **DEMO · hướng dẫn** (góc dưới trái): vào nhanh theo vai trò, kịch bản gợi ý, **Đặt lại dữ liệu**.
- Khác bản full-stack: không có khoá dòng DB thật, JWT thật, webhook HMAC thật, Swagger — phần đó demo bằng Docker.
- Build lại sau khi sửa frontend: `cd src/booking-tour-frontend && npm run build:offline`. Kiểm: `cd src/e2e && npx playwright test -c playwright.offline.config.ts`.

## Dựng
```bash
cd src
cp .env.example .env        # đổi mật khẩu và secret
docker compose up -d --build
```
Web http://localhost:3000 · API http://localhost:8080/api/v1 · Swagger http://localhost:8080/docs · Adminer (tuỳ chọn) `docker compose --profile tools up -d adminer` → http://localhost:8081.
Dữ liệu mẫu sinh theo ngày hôm nay. Làm sạch để demo lại: `docker compose down -v && docker compose up -d`.

## Tài khoản (mật khẩu `12345678`)
customer@example.com · mai.tran@example.com · guide@example.com · tuan.guide@example.com · manager@example.com · admin@example.com

## Kịch bản trình bày (15 phút)
1. **Khách** (customer@): tìm tour "Cần Thơ" → Cồn Sơn đợt còn 1 chỗ → đặt 1 vé → đồng hồ giữ chỗ 15 phút → Thanh toán → cổng giả lập → Thành công → đơn "Đã xác nhận", hoá đơn.
2. **Tranh chỗ cuối**: mở hai trình duyệt (customer@ và mai.tran@) cùng đặt đợt Cồn Sơn còn 1 chỗ → một người nhận "Đợt khởi hành đã hết chỗ". Nói về `SELECT … FOR UPDATE` và CHECK ở DB; mở `BookingConcurrencyIT`.
3. **Hết hạn**: khách đặt rồi không trả → admin@ → Tổng quan → Công cụ demo "+15 phút" → "Chạy job hết hạn ngay" → đơn "Hết hạn", chỗ được nhả.
4. **Huỷ và hoàn tiền**: customer@ mở đơn Hậu Giang (còn > 7 ngày) → Huỷ → xem "hoàn 100%". Đơn Cái Răng khởi hành trong 20 giờ → hoàn 0%.
5. **HDV** (guide@): Tour được phân công → đợt Cái Răng sắp khởi hành → Bắt đầu tour → Kết thúc tour.
6. **Đánh giá**: customer@ → Đơn của tôi → đơn Cái Răng đã hoàn thành → đánh giá 5 sao; thử lần hai bị chặn.
7. **Quản lý tour** (manager@): tạo tour, lịch trình, đợt; thử phân công HDV trùng lịch → bị chặn.
8. **Kỹ thuật**: Swagger, `docs/technical/state-machine.md`, migration có chú thích "≠ intern", kết quả test.

## Sự cố thường gặp
| Hiện tượng | Cách xử lý |
|---|---|
| Backend không healthy | `docker compose logs backend` — thường do `.env` thiếu `JWT_SECRET` (≥ 32 ký tự) |
| Web báo không kết nối được API | Kiểm `PUBLIC_API_URL` lúc build và CORS `FRONTEND_URL` |
| Cổng 3000/8080/3307 bị chiếm | Đổi phần trái của `ports` trong compose |
