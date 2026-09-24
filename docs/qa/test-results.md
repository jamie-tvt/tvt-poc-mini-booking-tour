---
id: qa.test-results
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [qa.test-plan]
tags: [qa, test-results]
---

# Kết quả test — 23/09/2026

## v1.1.0 — 24/09/2026 (F1, F2, F4, F6)

| Bộ test | Số test | Kết quả |
|---|---|---|
| Backend `./mvnw -B -ntp verify` (unit 26 + integration 16, gồm `TourSearchIT` mới 2 test: tìm không dấu, ngày trên thẻ khi lọc theo ngày) | 42 | Pass (MySQL 8.0 Testcontainers) |
| Frontend `npm run typecheck && npm test` (Vitest 9 file, thêm `images.test.ts` 5 test, `offline-demo/mock/fold.test.ts` 2 test) | 60 | Pass; `tsc --noEmit` sạch |
| `npm run build` (Next.js) | — | Pass |
| `npm run build:offline` → `review-html/BookingTour_Demo.html` | — | Pass |
| E2E demo offline `playwright.offline.config.ts` (thêm 3 test: F1 "phu quoc"/"can tho", F2, bộ lọc mobile + bottom sheet + nút DEMO không che CTA) | 10 | Pass |
| Soát giao diện 375px và 1280px (trang chủ, danh sách, bottom sheet, chi tiết, đặt tour) | — | Không tràn ngang; ảnh mới ở `review-html/screenshots/` (1, 2, 6–12) |

Chưa chạy lại E2E full-stack (`playwright.config.ts`, cần stack Docker) và bộ screenshot full-stack (3, 4, 5 giữ ảnh cũ — các màn này không đổi giao diện).

## v1.0 — 23/09/2026

| Bộ test | Số test | Kết quả |
|---|---|---|
| Demo offline 1 file HTML qua `file://` (`src/e2e/offline/offline-demo.spec.ts`, 24/09) | 7 | Pass — gồm E2E-01, huỷ/hoàn, hết hạn bằng đồng hồ demo, phân quyền, 20 màn không tràn ngang ở 390px, không lỗi JS |
| Backend unit (`StateMachineTest`, `RefundPolicyTest`, `TourDepartureTest`) | 26 | Pass |
| Backend integration (`AuthFlowIT` 4, `BookingConcurrencyIT` 2, `PaymentAndExpiryIT` 4, `GuideAndReviewFlowIT` 3, `SeatInvariantIT` 1) | 14 | Pass (MySQL 8.0 Testcontainers) |
| Frontend unit (Vitest, 7 file) | 53 | Pass; `tsc --noEmit` sạch; `next build` pass |
| E2E Playwright (Desktop Chrome + iPhone 14 Pro) | 6 | Pass |
| Screenshot (5 ảnh, DB sạch) | 5 | Đã chụp và soát từng ảnh — `review-html/screenshots/` |

Môi trường: macOS, Docker Desktop 29, Java 24 (build `--release 17`), Node 25 (image Node 22), MySQL 8.0.

## Còn hạn chế
- Trang tour không tồn tại hiện trang 404 nhưng HTTP 200 (do streaming `loading.tsx` của Next.js).
- `npm audit`: 1 cảnh báo trong postcss của Next 15.5 và 1 trong Vitest 3 — cần nâng Next 16 / Vitest 4.
- Chưa có ESLint trong frontend.
- Đường Stripe thật chưa chạy thử (không có khoá test); cùng mã với cổng giả lập ở phía nghiệp vụ.
