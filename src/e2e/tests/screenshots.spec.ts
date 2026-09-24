import { devices, expect, test } from "@playwright/test";
import { API, apiLogin, uiLogin } from "./helpers";

// 5 ảnh gửi kèm (references/08): landing desktop · chi tiết tour mobile · đặt vé mobile · đơn của tôi mobile · dashboard admin desktop
const OUT = "../../review-html/screenshots";
const mobile = { ...devices["iPhone 14 Pro"], browserName: "chromium" as const };

test.describe.configure({ mode: "serial" });

test("1 — trang chủ (desktop)", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${OUT}/1-trang-chu-desktop.png` });
  await page.close();
});

test("2 — chi tiết tour (mobile)", async ({ browser }) => {
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto("/tours/1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${OUT}/2-chi-tiet-tour-mobile.png` });
  await ctx.close();
});

test("3 — đơn của tôi (mobile)", async ({ browser }) => {
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await uiLogin(page, "customer@example.com");
  await page.goto("/bookings");
  await expect(page.getByText(/BT-DEMO/).first()).toBeVisible();
  await page.screenshot({ path: `${OUT}/3-don-cua-toi-mobile.png` });
  await ctx.close();
});

test("4 — chi tiết đơn đã đi, mời đánh giá (mobile)", async ({ browser, request }) => {
  const token = await apiLogin(request, "customer@example.com");
  const mine = (await (await request.get(`${API}/users/me/bookings?size=50`, { headers: { Authorization: `Bearer ${token}` } })).json()).data.content;
  const done = mine.find((b: { status: string; canReview: boolean }) => b.status === "COMPLETED" && b.canReview) ?? mine[0];
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await uiLogin(page, "customer@example.com");
  await page.goto(`/bookings/${done.id}`);
  await expect(page.getByText(done.bookingCode).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/4-chi-tiet-don-mobile.png` });
  await ctx.close();
});

test("5 — dashboard quản trị (desktop)", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await uiLogin(page, "admin@example.com");
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/5-dashboard-quan-tri-desktop.png` });
  await page.close();
});
