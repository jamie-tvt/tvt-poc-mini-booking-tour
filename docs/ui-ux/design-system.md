---
id: ui-ux.design-system
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: []
code_ref: [design-tokens.json, design-system/booking-tour/MASTER.md, src/booking-tour-frontend/src/styles]
tags: [ui-ux, design-system]
---

# Design system

Sinh bằng UI UX Pro Max (`design-system/booking-tour/MASTER.md`, ngành Travel/Tourism) rồi chuyển thành `design-tokens.json`. Font Be Vietnam Pro + Noto Sans (đủ dấu tiếng Việt).
Điều chỉnh của mentor: nút chính và CTA dùng sắc độ đậm hơn bảng gốc vì chữ trắng trên màu gốc không đạt tương phản 4.5:1. Checklist trước khi giao: không emoji làm icon, cursor-pointer, focus nhìn thấy, reduced-motion, responsive 375/768/1024/1440.

## Nền mờ theo ảnh (v1.1.0, 24/09/2026)

Chỉ áp dụng khu khách (trang chủ, danh sách, chi tiết, đặt tour); khu quản trị giữ nguyên. Không thêm màu thương hiệu mới — chỉ thêm token `night` (gradient tối đè ảnh hero) và bóng `shadow-glass`, `shadow-float` trong `globals.css`.

- **`PhotoBackdrop`** (`components/shared/PhotoBackdrop.tsx`, không hook → dùng được trong Server Component): ảnh của chính tour ở cỡ `w=64&q=40` phóng to, `blur(48px) saturate(1.4)`, phủ lớp màu nền — `tone="page"`: gradient màu nền 55% → 82% → 100%; `tone="card"`: trắng 80%. Nằm ở `-z-10`, cha cần `relative isolate`.
- **`.glass`**: nền trắng 72% + `backdrop-blur 16px`, viền trắng 60%, bóng nhẹ màu ink, bo 16px — form tìm kiếm trên hero, khối giá/đợt gần nhất ở trang chi tiết, thanh CTA dính đáy. **`.pill-glass`**: nhãn viên thuốc trên nền mờ.
- **Bottom sheet** (`components/ui/BottomSheet.tsx`): bộ lọc tour trên mobile (< lg). `role="dialog" aria-modal`, Esc / nút đóng / bấm nền để đóng, giữ focus trong sheet, trả focus về nút mở, khoá cuộn trang; nền `ink/35` + blur 3px; render qua portal để luôn nằm trên cùng.
- **Ảnh**: `unsplashVariant(url, w, q)` (`lib/utils/images.ts`) — thẻ 800, chi tiết 1200 (srcSet 800/1200/1600), hero eager + `fetchpriority=high`, còn lại lazy, giữ `aspect-ratio`. Lỗi ảnh → SVG minh hoạ cùng chủ đề → placeholder.
- **A11y**: `prefers-reduced-transparency: reduce` → bỏ ảnh mờ, kính thành nền trắng đặc; transition ≤ 200ms và tôn trọng `prefers-reduced-motion`; vùng bấm ≥ 44px (chip, nút lọc, nút DEMO tròn); trang có thanh CTA dính đáy tự chừa `padding-bottom` (`body:has(.sticky-cta)`).
