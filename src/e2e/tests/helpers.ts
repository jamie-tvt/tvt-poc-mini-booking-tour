import { APIRequestContext, expect, Page } from "@playwright/test";

export const API = process.env.API_URL ?? "http://localhost:8080/api/v1";
export const PW = "12345678";

export async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: PW } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data.accessToken as string;
}

/** Quản lý tạo một tour + đợt khởi hành riêng cho lần chạy test, HDV tuan.guide@example.com phụ trách (HDV Hưng giữ lịch mẫu để demo tay). */
export async function createTripForGuide(request: APIRequestContext, startInHours = 6) {
  const manager = await apiLogin(request, "manager@example.com");
  const headers = { Authorization: `Bearer ${manager}` };
  const categories = (await (await request.get(`${API}/categories`)).json()).data;
  const guides = (await (await request.get(`${API}/guides`, { headers })).json()).data;
  const guide = guides.find((g: { email: string }) => g.email === "tuan.guide@example.com");
  const code = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const tour = (await (await request.post(`${API}/tours`, {
    headers,
    data: { tourCode: code, title: `Tour kiểm thử ${code}`, description: "Tour tạo tự động bởi E2E", destination: "Cần Thơ",
      durationDays: 1, maxGuests: 20, price: 500000, categoryId: categories[0].id, status: "ACTIVE" },
  })).json()).data;
  // Mỗi lần chạy thử vài khung giờ cho tới khi HDV rảnh (backend chặn lịch trùng — SRS 9.8)
  let dep;
  for (let slot = 0; slot < 30; slot++) {
    const start = new Date(Date.now() + startInHours * 3600_000 + slot * 37 * 60_000);
    const end = new Date(start.getTime() + 30 * 60_000);
    dep = await request.post(`${API}/tours/${tour.id}/departures`, {
      headers, data: { startAt: start.toISOString(), endAt: end.toISOString(), capacity: 10, tourGuideId: guide.id },
    });
    if (dep.status() !== 409) break;
  }
  expect(dep!.status(), await dep!.text()).toBe(201);
  return { tour, departure: (await dep!.json()).data };
}

export async function uiLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill(PW);
  await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
