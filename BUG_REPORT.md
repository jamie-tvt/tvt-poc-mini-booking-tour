# Bug Report

## Status
FIX APPLIED — AWAITING VERIFICATION

## Bug Title
Booking Tour: bộ lọc không ra kết quả khi gõ không dấu · bộ lọc quá dài trên mobile · ảnh tour là SVG minh hoạ · deploy chạy theo mọi commit

## Bug Description
Kiểm tra 4 hạng mục theo yêu cầu mentor trên bản deploy https://tvt-poc-mini-booking-tour.vercel.app (ngày 24/09/2026):

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Responsive mobile (375px) | ✅ 27 route (public, khách, HDV, quản lý, admin): không vỡ layout, không cuộn ngang (bảng cuộn trong khung riêng). ⚠️ 2 lỗi UX |
| 2 | Bộ lọc tour | ❌ Từ khoá **không dấu** → 0 kết quả. Các bộ lọc còn lại (danh mục, giá, ngày, sắp xếp, nút Áp dụng/Xoá) đều đúng |
| 3 | Ảnh tour | SVG minh hoạ → đổi sang ảnh thật từ Unsplash |
| 4 | CI/CD | Deploy Production ở **mọi** push `main` + Preview ở mọi PR → yêu cầu chỉ deploy khi có tag release |

## Steps to Reproduce
1. Mở `/#/tours?keyword=phu quoc` (hoặc gõ "Can Tho", "cho noi" vào ô Từ khoá) → "Không tìm thấy tour phù hợp". Gõ "Phú Quốc" → 1 tour.
2. Mở `/#/tours` ở khổ 375px → phải cuộn qua 7 ô lọc (~1,3 màn hình) mới thấy tour đầu tiên.
3. Ở khổ mobile, nút nổi "DEMO · hướng dẫn" đè lên giá tiền/nút "Chọn đợt này" ở góc dưới trái.
4. Lọc `departFrom=2026-10-01&departTo=2026-10-15` → thẻ tour vẫn hiện "Khởi hành 25/09/2026" (ngoài khoảng đã lọc).

## Actual Result
Xem bảng trên + bước 1–4.

## Expected Result
- Tìm "phu quoc" / "can tho" ra kết quả như có dấu (giống hành vi MySQL `utf8mb4_unicode_ci` của backend thật).
- Mobile: bộ lọc gọn (thu lại được), kết quả xuất hiện ngay màn hình đầu; nút DEMO không che nội dung.
- Ảnh tour là ảnh thật; vẫn có ảnh dự phòng khi mất mạng.
- Chỉ deploy Production khi đẩy tag release (`v*`); commit/PR thường chỉ chạy test.

## Context
- **Environment**: Vercel (bản offline-demo, API giả lập trong trình duyệt) · Chrome 375×812 giả lập mobile
- **Công cụ**: quét tự động phần tử tràn ngang trên 27 route theo 4 vai trò; test bộ lọc bằng URL + thao tác UI


## Quyết định của mentor (24/09/2026)
- Duyệt F1, F2, F4 (link CDN), F5 (tag đầu tiên `v1.1.0`). F3 được thay bằng thiết kế mới ở **F6** (ui-ux-pro-max, nền mờ theo ảnh).

---

## Root Cause Analysis

**(2) Từ khoá không dấu** — chỉ ở API giả lập của bản demo:
```
TourFilters → /tours?keyword=phu quoc
  ├─ Backend thật: TourService.publicSpec  lower(title) LIKE '%phu quoc%'
  │     cột utf8mb4_unicode_ci → so khớp bỏ dấu ⇒ khớp "Phú Quốc" ✅
  └─ Demo mock:   s.toLowerCase().includes(kw)  ⇒ so khớp có dấu ❌
```
- `src/booking-tour-frontend/offline-demo/mock/server.ts:416` (+ các ô tìm kiếm quản trị `:445`, `:726`, `:947` cùng cách).
- Backend: `TourService.java:77-80` dựa vào collation. **Chưa có test khoá hành vi này**, và chữ `đ` với `d` có thể không được coi là một (cần test để chắc).

**(2b) Ngày trên thẻ tour khi lọc theo ngày**: thẻ luôn hiện đợt khởi hành gần nhất (`nextDepartureAt`), không phải đợt nằm trong khoảng ngày đã lọc (`TourCard.tsx:38`, `TourService.java:54-67`, mock `server.ts:118`). Lọc vẫn đúng, nhưng người dùng tưởng lọc hỏng.

**(1) Mobile**
- `TourFilters.tsx:57`: lưới `sm:grid-cols-2 lg:grid-cols-4` → dưới 640px là 1 cột, 7 ô + nút xếp chồng.
- `offline-demo/DemoPanel.tsx:163-170`: nút `fixed` góc dưới trái, trang không chừa khoảng trống phía dưới.

**(3) Ảnh**: seed ghi `/images/tours/<slug>.svg` ở `DemoDataSeeder.java:165,169` và mock `db.ts:122,125`; `TourImage` là `<img>` thường, `onError` → `placeholder.svg`.

**(4) CI/CD**: `.github/workflows/ci-cd-vercel.yml` trigger `push: main` + `pull_request`, job deploy luôn chạy sau test.

## Proposed Fixes

**F1 — Tìm kiếm bỏ dấu (khuyến nghị)**: thêm hàm `fold()` (NFD, bỏ dấu, `đ→d`, lowercase) trong mock và dùng ở 4 ô tìm kiếm. Thêm test backend (Testcontainers) `keyword=phu quoc`/`can tho` → có kết quả. Nếu test cho thấy MySQL không coi `đ` = `d` thì mới sửa backend.

**F2 — Ngày trên thẻ khi lọc theo ngày** (tuỳ chọn): khi có `departFrom/departTo`, `nextDepartureAt` là đợt đầu tiên **trong khoảng** (sửa `TourService` + mock). Sửa nhỏ, có test.

**F3 — Mobile**
- `TourFilters`: dưới `lg`, chỉ hiện ô Từ khoá + nút "Bộ lọc (n)" (n = số điều kiện đang bật), bấm để mở các ô còn lại. Desktop giữ nguyên.
- `DemoPanel`: trên mobile thu thành nút tròn chỉ có icon; thêm `padding-bottom` cho trang demo.

**F4 — Ảnh Unsplash**
| Phương án | Ưu | Nhược |
|---|---|---|
| **A. Link thẳng CDN `images.unsplash.com/photo-…?auto=format&fit=crop&w=1200&q=75` (khuyến nghị)** | Repo không thêm file nhị phân; CDN tự nén WebP/AVIF; file HTML offline vẫn nhẹ | Cần mạng. Mất mạng → hiện SVG dự phòng (đã có sẵn) |
| B. Tải JPG về `public/images` | Chạy offline được | Repo nặng thêm ~3MB; file HTML 1 file sẽ lên ~4MB |

Ảnh đã chọn và kiểm tra tải được (8 tour): Cái Răng (chợ nổi), Cồn Sơn (kênh dừa nước), Hậu Giang (xuồng trong kênh), Mũi Cà Mau (rừng đước), Sóc Trăng (chùa Khmer), Phú Quốc (bãi biển), Trà Sư (rừng tràm), Bạc Liêu (điện gió). Sửa seeder Java, mock `db.ts`, ghi tên tác giả trong comment. DB MySQL đang chạy ở máy local cần `docker compose down -v` để seed lại.

**F5 — Deploy theo tag release**
```
push main / PR  ──► test FE + BE            (không deploy)
push tag v*.*.* ──► test FE + BE ──► deploy Production ──► tạo GitHub Release (ghi chú tự sinh)
```
- Chặn tag không nằm trên `main`. Bỏ Preview ở PR (vì mỗi commit PR sẽ tạo 1 bản deploy).
- Phát hành: `git tag v1.1.0 && git push origin v1.1.0`.

**F6 — Chỉnh lại thiết kế: nền mờ theo ảnh Unsplash** (theo phản hồi mentor, dùng skill ui-ux-pro-max; mockup: `scratchpad/mockup/index.html`)
- Giữ nguyên màu và font thương hiệu (`design-tokens.json`). Chỉ thêm 1 lớp hiệu ứng, không đổi layout nghiệp vụ.
- Component dùng chung `PhotoBackdrop`: đặt bản ảnh nhỏ (`w=64`, vài KB) phóng to + `blur(48px) saturate(1.4)`, trên phủ gradient màu nền (55%→100%) để chữ đạt tương phản ≥ 4.5:1. Cùng URL gốc nên ảnh được cache, không tải thêm ảnh lớn. Mất mạng thì nền dùng lại SVG dự phòng.
- Áp dụng:
  | Màn | Thiết kế |
  |---|---|
  | Trang chủ | Hero là ảnh thật full-bleed + gradient tối; form tìm kiếm là thẻ kính mờ (`backdrop-blur 16px`, nền trắng 72%) |
  | Danh sách | Nền trang mờ theo ảnh tour/khách sạn đầu tiên. Mobile: ô tìm kiếm + nút "Bộ lọc (n)" + "Sắp xếp" + chip điều kiện (bấm ✕ để bỏ) → bottom sheet chứa toàn bộ bộ lọc và nút "Xem N kết quả". Desktop giữ bố cục cũ |
  | Thẻ tour/khách sạn | Ảnh sắc nét phía trên; phần nội dung có sắc màu mờ của chính ảnh đó (phủ trắng 80%) |
  | Chi tiết | Nền đầu trang mờ theo ảnh cover; gallery nổi lên bằng shadow; thông tin chính trong thẻ kính. Mobile có thanh giá + nút CTA dính đáy (kính mờ) |
  | Đặt tour / Checkout | Thẻ tóm tắt đơn có nền mờ theo ảnh tour/khách sạn |
- A11y/hiệu năng: tôn trọng `prefers-reduced-motion`; `prefers-reduced-transparency` → dùng nền đặc; vùng bấm ≥ 44px; ảnh `loading="lazy"` trừ hero; giữ `aspect-ratio` để không nhảy layout. Khu quản trị không đổi (chỉ khu khách).
- DEMO: trên mobile nút thu thành hình tròn 44px, trang chừa `padding-bottom`.

## Verification Plan
- `npm run typecheck && npm test`, `./mvnw verify` (có test mới: tìm bỏ dấu, F2 nếu làm).
- E2E offline (`playwright.offline.config.ts`) + thêm case: tìm "phu quoc" ra 1 tour.
- Quét lại 27 route ở 375px; chụp màn hình `/tours` và chi tiết tour trên mobile.
- CI: push `main` → chỉ test; đẩy tag → deploy + có GitHub Release; kiểm tra site Production hiện ảnh thật.

---

## Fix Applied

Ngày 24/09/2026 · F1, F2, F4 (Tour), F6 theo spec đã duyệt. F5 (workflow `.github/`) do người điều phối sửa, không nằm trong lần sửa này.

### Files Changed
**Backend** (`src/booking-tour-backend/`)
- `application/tour/TourService.java` — F1: so khớp từ khoá đổi `đ → d` ở cả hai vế (`replace(lower(col),'đ','d')`), cho cả ô tìm của quản lý; F2: `summarize(..., from, to)` → `nextDepartureAt` là đợt đầu tiên trong khoảng lọc.
- `infrastructure/seed/DemoDataSeeder.java` — F4: ảnh tour là link CDN Unsplash (ghi tác giả).
- `src/test/.../it/TourSearchIT.java` (mới) — "phu quoc", "Phú Quốc", "can tho", "cho noi", "dong thap", "ĐỒNG THÁP", "nam dao", ô tìm quản lý; lọc ngày +20..+30 → thẻ hiện đợt +24 (sort `nextDeparture` và `price,asc`), chỉ `departFrom` → đợt +38.

**Frontend** (`src/booking-tour-frontend/`)
- `src/lib/utils/images.ts` (mới) + `tests/images.test.ts` — `unsplashVariant`, `unsplashSrcSet`, `fallbackImageFor` (ảnh seed → SVG cùng chủ đề), `HOME_HERO_IMAGE`.
- `src/components/shared/PhotoBackdrop.tsx` (mới), `src/components/ui/BottomSheet.tsx` (mới), `src/styles/globals.css` (`.glass`, `.pill-glass`, reduced-transparency, token `night`, bóng `glass`/`float`, `sheet-up`, chừa đáy cho `.sticky-cta`).
- `src/components/shared/TourImage.tsx` — cỡ ảnh theo nơi dùng, srcSet, lỗi → SVG cùng chủ đề → placeholder.
- `src/app/(public)/page.tsx` + `features/tours/components/HeroSearch.tsx` — hero ảnh thật + form kính mờ đè mép dưới.
- `src/app/(public)/tours/page.tsx` + `features/tours/components/TourFilters.tsx` — nền mờ theo tour đầu tiên; mobile: ô từ khoá + "Bộ lọc (n)" + "Sắp xếp" + chip ✕ + bottom sheet ("Xem N tour" đếm trước); desktop giữ lưới 4 cột (nền kính).
- `features/tours/components/TourCard.tsx` — sắc màu mờ theo ảnh, nhãn danh mục dạng pill kính.
- `src/app/(public)/tours/[id]/page.tsx` + `features/tours/components/TourGallery.tsx` — đầu trang nền mờ, gallery nổi, pill, khối "Đợt gần nhất" + giá trong `.glass`, thanh giá + "Chọn đợt" dính đáy (mobile).
- `features/bookings/components/BookingForm.tsx` — thẻ "Tóm tắt đơn" có nền mờ theo ảnh tour.
- `offline-demo/mock/server.ts`, `offline-demo/mock/fold.ts` (mới) + `fold.test.ts` — F1 `fold()` ở `/tours`, `/manager/tours`, `/admin/bookings`, `/admin/users`; F2 như backend.
- `offline-demo/mock/db.ts` — ảnh Unsplash (ghi tác giả), khoá lưu trữ `bt.demo.db.v2` để trình duyệt đã mở bản cũ tự seed lại.
- `offline-demo/DemoPanel.tsx`, `offline-demo/main.tsx`, `offline-demo/vite.config.ts`, `offline-demo/tsconfig.json`, `vitest.config.ts` — nút DEMO tròn 44px trên mobile (tên "Mở hướng dẫn demo"), nằm trên thanh CTA dính đáy; body chừa `padding-bottom`; SVG dự phòng nhúng data URL; Vitest chạy cả test trong `offline-demo`.

**E2E / tài liệu / bản demo**
- `src/e2e/offline/offline-demo.spec.ts` — thêm 3 test (F1, F2, bộ lọc mobile + DEMO); test cũ chỉ đổi cách lấy ảnh gallery (trước lấy `img` đầu tiên, nay là ảnh nền mờ).
- `docs/decisions.md` (D14–D19), `docs/ui-ux/design-system.md`, `docs/qa/test-results.md`, `docs/changelog.md` (v1.1.0), `docs/technical/api-contracts.md` (docs-lint `--generate` + kiểm tra: OK).
- `review-html/BookingTour_Demo.html` (build lại), `review-html/screenshots/` (1, 2 thay mới; 6–12 mới).

### Test Results
| Lệnh | Kết quả |
|---|---|
| `./mvnw -B -ntp verify` | 42/42 pass (unit 26, IT 16 — `TourSearchIT` 2 mới). Lần chạy đầu `TourSearchIT` fail ở "dong thap" → xác nhận `utf8mb4_unicode_ci` coi `đ ≠ d` → đã sửa backend |
| `npm run typecheck && npm test` | tsc sạch · 60/60 pass (9 file) |
| `npm run build` | Pass |
| `npm run build:offline` | Pass (634 KB) |
| `npx playwright test -c playwright.offline.config.ts` | 10/10 pass |

### Verification
- Soát trực quan bằng Playwright ở 375×812 và 1280×800: trang chủ, danh sách (đóng/mở bottom sheet, sau khi lọc), `keyword=phu quoc`, lọc ngày, chi tiết, đặt tour — không tràn ngang, chữ đọc rõ. Ảnh: `review-html/screenshots/`.
- Đã sửa sau khi soát: bottom sheet bị nút DEMO đè (do nằm trong stacking context `isolate`) → render qua portal; thanh CTA dính đáy tăng độ đục (trắng 85%) để chữ bên dưới không lộ; tăng gradient tối trên hero.
- Còn cần người điều phối: sửa workflow (F5), `docker compose down -v` ở máy local để DB seed lại ảnh mới, chạy lại E2E full-stack + deploy tag `v1.1.0` rồi kiểm tra site Production.
