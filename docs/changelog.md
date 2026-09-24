---
id: changelog
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: []
tags: [changelog]
---

# Nhật ký thay đổi

- 2026-09-24 — **v1.2.0** — thêm 200 tour miền Tây (13 tỉnh, 120 địa điểm có thật, 600 đợt khởi hành) với mô tả thực tế và 3–5 ảnh Unsplash/tour đã duyệt tay theo chủ đề (chợ nổi, rạch dừa, chùa Khmer, rừng tràm, biển đảo…). Dữ liệu sinh bởi `src/seed-catalog/generate.mjs` → `seed/mekong-catalog.json`; `DemoDataSeeder.seedCatalog()` và API giả lập offline cùng đọc file này. Thêm 2 danh mục "Ẩm thực – Làng nghề", "Miệt vườn – Nông trại". Bản demo đổi khoá lưu trữ sang `bt.demo.db.v3`; DB MySQL local cần `docker compose down -v` để seed lại. E2E offline tính số kỳ vọng từ catalog.
- 2026-09-24 — **v1.1.0** (phản hồi mentor, `BUG_REPORT.md`):
  - F1 — tìm tour gõ không dấu ("phu quoc", "can tho", "dong thap") ra kết quả như có dấu: backend đổi `đ → d` khi so khớp (`TourService`), API giả lập dùng `fold()` cho mọi ô tìm kiếm; thêm `TourSearchIT`.
  - F2 — lọc theo khoảng ngày thì thẻ tour hiện đợt khởi hành nằm trong khoảng (backend + API giả lập).
  - F4 — ảnh tour là ảnh thật Unsplash (link CDN, ghi công tác giả trong `DemoDataSeeder` và `offline-demo/mock/db.ts`); mất mạng hiện SVG minh hoạ cùng chủ đề. DB MySQL local cần `docker compose down -v` để seed lại; bản demo đổi khoá lưu trữ sang `bt.demo.db.v2` để tự seed lại.
  - F6 — thiết kế nền mờ theo ảnh: `PhotoBackdrop`, `.glass`, hero ảnh thật + form tìm kiếm kính mờ, thẻ tour có sắc màu của ảnh, trang chi tiết có thanh giá + CTA dính đáy (mobile), bộ lọc mobile dạng bottom sheet + chip; nút DEMO thu thành nút tròn 44px trên mobile.
  - F5 — deploy theo tag release (workflow do người điều phối cập nhật).
- 2026-09-24 — Thêm bản demo offline `review-html/BookingTour_Demo.html`: build chính frontend Next.js bằng Vite (shim `next/link`, `next/navigation`, router theo `#`) + API giả lập trong trình duyệt; mã ở `src/booking-tour-frontend/offline-demo/`, test `src/e2e/offline/`. Không đổi code app.
- 2026-09-23 — Sửa lỗi đồng thời: một số service nạp entity rồi mới khoá dòng nên có thể ghi đè số chỗ bằng dữ liệu cũ; chuyển sang lấy id bằng projection trước khi khoá, thêm `SeatInvariantIT`. Phát hiện khi làm POC Hotel.
- 2026-09-23 — Bản POC v1: backend Spring Boot (39 test pass), frontend Next.js (53 test pass), Docker Compose, E2E Playwright luồng chính trên desktop và iPhone, 5 screenshot.
