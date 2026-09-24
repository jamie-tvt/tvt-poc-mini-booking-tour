---
id: changelog
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: []
tags: [changelog]
---

# Nhật ký thay đổi

- 2026-09-24 — Thêm bản demo offline `review-html/BookingTour_Demo.html`: build chính frontend Next.js bằng Vite (shim `next/link`, `next/navigation`, router theo `#`) + API giả lập trong trình duyệt; mã ở `src/booking-tour-frontend/offline-demo/`, test `src/e2e/offline/`. Không đổi code app.
- 2026-09-23 — Sửa lỗi đồng thời: một số service nạp entity rồi mới khoá dòng nên có thể ghi đè số chỗ bằng dữ liệu cũ; chuyển sang lấy id bằng projection trước khi khoá, thêm `SeatInvariantIT`. Phát hiện khi làm POC Hotel.
- 2026-09-23 — Bản POC v1: backend Spring Boot (39 test pass), frontend Next.js (53 test pass), Docker Compose, E2E Playwright luồng chính trên desktop và iPhone, 5 screenshot.
