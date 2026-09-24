---
id: qa.test-results
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [qa.test-plan]
tags: [qa, test-results]
---

# Kết quả test — 23/09/2026

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
