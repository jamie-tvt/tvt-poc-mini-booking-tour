# Booking Tour — Frontend (Next.js)

Frontend POC "Booking Tour" (bản mẫu của team mentor), gọi API Spring Boot theo `docs/technical/api-contracts.md`.

- Next.js 15.5 (App Router, `output: "standalone"`), React 19, TypeScript strict
- Tailwind CSS v4 (`@tailwindcss/postcss`), lucide-react (icon), zod (validate)
- Vitest 3 + React Testing Library + jsdom
- UI tiếng Việt, font Be Vietnam Pro (heading) + Noto Sans (body) qua `next/font/google`

## Lệnh

```bash
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # next build (pass kể cả khi backend chưa chạy)
npm start           # next start -p 3000
```

## Biến môi trường

| Biến | Khi nào đọc | Mặc định | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **lúc build** (nhúng vào bundle trình duyệt) | `http://localhost:8080/api/v1` | URL trình duyệt gọi API |
| `API_INTERNAL_URL` | lúc chạy (server) | `NEXT_PUBLIC_API_URL` → mặc định trên | URL Server Component gọi API. Trong Docker: `http://backend:8080/api/v1` |

Xem `.env.example`.

## Docker

```bash
docker build -t booking-tour-frontend --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 .
docker run -p 3000:3000 -e API_INTERNAL_URL=http://backend:8080/api/v1 booking-tour-frontend
```

Multi-stage (node:22-alpine): `npm ci` → `next build` → chạy `server.js` của bản standalone bằng user không phải root, `HOSTNAME=0.0.0.0`, `PORT=3000`.

## Cấu trúc

```
src/
  app/                      # chỉ định tuyến (App Router); page mỏng, render component của feature
    (public)/               # /, /tours, /tours/[id]           — Server Component, fetch no-store, force-dynamic
    (auth)/                 # /login, /register
    (customer)/             # /tours/[id]/booking, /bookings, /bookings/[id], /pay/mock/[paymentId],
                            # /notifications, /account          — layout yêu cầu đăng nhập
    manager/                # /manager, /manager/tours/new, /manager/tours/[id], /manager/categories,
                            # /manager/places, /manager/bookings[/id]      — TOUR_MANAGER | ADMIN
    operator/               # /operator/tours, /operator/tours/[departureId] — TOUR_GUIDE
    admin/                  # /admin (Staff), /admin/bookings, /admin/reviews (Staff),
                            # /admin/users, /admin/payments, /admin/settings, /admin/audit-logs (ADMIN)
  features/<feature>/{components,services,types,validators,tests}
                            # auth, tours, bookings, payments, notifications, account, manager, operator, admin
  components/{layout,shared,ui}   # header/footer/sidebar, guard/lỗi/rỗng, Button/Field/Dialog/Tabs/...
  lib/api                   # http.ts (bóc ApiResponse), client.ts (trình duyệt: token + refresh), server.ts (RSC)
  lib/auth                  # session (localStorage `bt.auth`), AuthProvider, roles
  lib/config                # env, navigation
  lib/utils                 # định dạng tiền VND / ngày giờ VN, nhãn trạng thái, query, zod helpers
  styles/globals.css        # Tailwind v4 + design tokens (@theme)
  types/                    # DTO theo hợp đồng, ApiResponse/PageResponse
public/images/tours/*.svg   # ảnh minh hoạ (backend seed dùng URL /images/tours/cai-rang.svg ...)
```

## Quy ước chính

- **Server Component mặc định.** Chỉ gắn `'use client'` cho component tương tác (form, dialog, trang cần token).
- **Gọi API**
  - Trang công khai dùng `serverGet` (`cache: "no-store"`). Backend không chạy thì trang hiện trạng thái lỗi thân thiện, không crash.
  - Trang cần đăng nhập dùng `api` (`lib/api/client.ts`). Token lưu ở `localStorage` key `bt.auth` = `{accessToken, refreshToken, user}`.
  - Khi API trả `401 TOKEN_EXPIRED`, client refresh **một lần** (có khoá chống gọi refresh song song) rồi gọi lại request gốc.
  - Refresh hỏng thì client xoá phiên và chuyển `/login?next=...`.
- **Lỗi**
  - Mọi lỗi được chuẩn hoá thành `ApiError {status, code, message, errors}`.
  - UI hiển thị `message` tiếng Việt từ backend. Lỗi `VALIDATION_FAILED` hiện dưới từng field.
- **Guard**: `RequireAuth` ở layout chỉ phục vụ UX. Backend vẫn kiểm tra quyền ở mọi API.
- **A11y**
  - Mọi input có `<label htmlFor>`, nút có tên truy cập rõ (Playwright `getByRole`/`getByLabel` dùng được).
  - Focus hiển thị rõ; badge trạng thái luôn có chữ, không chỉ dựa vào màu.
  - Hộp thoại dùng `<dialog>` gốc (không dùng `window.confirm`).
  - Tôn trọng `prefers-reduced-motion`.
- **Màu** (tương phản ≥ 4.5:1)
  - Nút chính `#0369A1` (hover `#075985`).
  - CTA đặt tour `#C2410C` (hover `#9A3412`).
  - `#0EA5E9` chỉ dùng để trang trí.

## Test

- `lib/utils/tests/format.test.ts`: tiền VND, ngày giờ VN (Asia/Ho_Chi_Minh), chuyển đổi datetime-local
- `lib/api/tests/client.test.ts`: bóc ApiResponse, lỗi có `code`, refresh khi 401, khoá refresh song song, đăng xuất khi refresh hỏng
- `features/auth/tests/authSchemas.test.ts`: validator đăng ký, đăng nhập
- `features/bookings/tests/*`: validator đặt tour và đánh giá, tổng tiền, `BookingStatusBadge`, `QuantityStepper`
