import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Kiểm bản demo offline (review-html/BookingTour_Demo.html) mở bằng file:// — không cần Docker.
 * Cùng kịch bản E2E-01 như bản full-stack, chạy trên dữ liệu mẫu có sẵn.
 */
const FILE = "file://" + path.resolve(__dirname, "../../../review-html/BookingTour_Demo.html");
const go = (page: Page, route: string) => page.goto(`${FILE}#${route}`);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

async function login(page: Page, email: string) {
  await go(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill("12345678");
  await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
  await expect(page).not.toHaveURL(/#\/login/);
}

async function logout(page: Page) {
  await page.evaluate(() => localStorage.removeItem("bt.auth"));
}

test.beforeEach(async ({ page }) => {
  await go(page, "/");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem("bt.demo.panel-seen", "1"));
  await page.reload();
});

test("trang công khai: trang chủ, tìm kiếm, chi tiết tour", async ({ page }) => {
  const errors = watchErrors(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("chợ nổi");
  await expect(page.getByText("Tour sắp khởi hành")).toBeVisible();
  await page.getByRole("link", { name: /Xem tất cả tour/ }).click();
  await expect(page).toHaveURL(/#\/tours\?sort=nextDeparture/);
  await expect(page.getByText(/Tìm thấy/)).toContainText("7");
  await page.getByRole("link", { name: /Phú Quốc/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Phú Quốc");
  await expect(page.getByText("Lịch trình", { exact: true })).toBeVisible();
  await expect(page.getByText(/Lịch trình hợp lý, khách sạn sạch/)).toBeVisible(); // đánh giá có sẵn
  const img = page.locator("img").first();
  await expect(img).toHaveJSProperty("complete", true);
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("E2E-01: đăng ký → đặt → thanh toán → HDV bắt đầu/kết thúc → đánh giá", async ({ page }) => {
  const errors = watchErrors(page);
  const email = `demo-${Date.now()}@example.com`;

  await go(page, "/register");
  await page.getByLabel("Họ và tên").fill("Khách Demo");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill("12345678");
  await page.getByLabel("Nhập lại mật khẩu").fill("12345678");
  await page.getByRole("button", { name: /Đăng ký|Tạo tài khoản/ }).click();
  await expect(page).toHaveURL(/#\/login/);

  await login(page, email);
  await go(page, "/tours/1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cái Răng");
  // Đợt gần nhất (khởi hành trong 20 giờ, HDV Hưng)
  await page.getByRole("link", { name: /Chọn đợt này/ }).first().or(page.getByRole("button", { name: /Chọn đợt này/ }).first()).click();
  await expect(page).toHaveURL(/\/booking/);
  await page.getByRole("button", { name: "Tăng số vé người lớn" }).click();
  await expect(page.getByText(/1\.300\.000\s*₫/).first()).toBeVisible();
  await page.getByRole("button", { name: /Giữ chỗ/ }).click();
  await expect(page).toHaveURL(/#\/bookings\/\d+/);
  await expect(page.getByText(/Chờ thanh toán/).first()).toBeVisible();
  const bookingUrl = page.url();

  await page.getByRole("button", { name: /^Thanh toán/ }).first().click();
  await expect(page).toHaveURL(/#\/pay\/mock\/\d+/);
  await page.getByRole("button", { name: /Thanh toán thành công/ }).click();
  await expect(page).toHaveURL(/#\/bookings\/\d+/);
  await expect(page.getByText(/Đã xác nhận/).first()).toBeVisible();

  await logout(page);
  await login(page, "guide@example.com");
  await go(page, "/operator/tours");
  await page.getByRole("link", { name: /Cái Răng/ }).first().click();
  await expect(page.getByText("Khách Demo")).toBeVisible();
  await page.getByRole("button", { name: /Bắt đầu tour/ }).click();
  await page.getByRole("button", { name: "Xác nhận bắt đầu" }).click();
  await page.getByRole("button", { name: /Kết thúc tour/ }).click();
  await page.getByRole("button", { name: "Xác nhận kết thúc" }).click();
  await expect(page.getByText(/Đã hoàn thành/).first()).toBeVisible();

  await logout(page);
  await login(page, email);
  await page.goto(bookingUrl);
  await expect(page.getByText(/Đã hoàn thành/).first()).toBeVisible();
  await page.getByRole("radio", { name: "5 sao" }).check({ force: true });
  await page.getByLabel("Cảm nhận của bạn").fill("Hướng dẫn viên nhiệt tình, lịch trình hợp lý.");
  await page.getByRole("button", { name: /Gửi đánh giá/ }).click();
  await expect(page.getByText(/Cảm ơn bạn đã gửi đánh giá/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("huỷ đơn thấy trước % hoàn, dữ liệu sang được trang quản trị", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page, "customer@example.com");
  await go(page, "/bookings");
  await expect(page.getByText(/BT-DEMO/).first()).toBeVisible();
  await go(page, "/bookings/4"); // BT-DEMOD: Hậu Giang, còn 10 ngày → hoàn 100%
  await page.getByRole("button", { name: "Huỷ đặt tour" }).click();
  await expect(page.getByRole("dialog").getByText("(100%)")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận huỷ" }).click();
  await expect(page.getByText(/Đã huỷ/).first()).toBeVisible();

  await logout(page);
  await login(page, "admin@example.com");
  await expect(page).toHaveURL(/#\/admin/);
  await go(page, "/admin/payments");
  await expect(page.locator("table").getByText("Đã hoàn tiền").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("phân quyền: chưa đăng nhập bị chuyển về đăng nhập, khách không vào được quản trị", async ({ page }) => {
  await go(page, "/bookings");
  await expect(page).toHaveURL(/#\/login\?next=/);
  await login(page, "mai.tran@example.com");
  await go(page, "/admin/users");
  await expect(page.getByText(/không có quyền/i).first()).toBeVisible();
});

test("mọi màn chính mở được, không tràn ngang trên mobile", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await go(page, "/");
  await page.evaluate(() => localStorage.setItem("bt.demo.panel-seen", "1"));
  const check = async (route: string) => {
    await go(page, route);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `tràn ngang ở ${route}`).toBeLessThanOrEqual(1);
    await expect(page.getByText("Đã có lỗi xảy ra")).toHaveCount(0);
  };
  for (const r of ["/", "/tours", "/tours/3", "/login", "/register"]) await check(r);
  await login(page, "manager@example.com");
  for (const r of ["/manager", "/manager/tours/new", "/manager/tours/1", "/manager/categories", "/manager/places", "/manager/bookings", "/admin"]) await check(r);
  await logout(page);
  await login(page, "admin@example.com");
  for (const r of ["/admin/users", "/admin/payments", "/admin/reviews", "/admin/settings", "/admin/audit-logs", "/admin/bookings"]) await check(r);
  await logout(page);
  await login(page, "guide@example.com");
  for (const r of ["/operator", "/operator/tours"]) await check(r);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("công cụ demo: tua đồng hồ +15 phút → đơn chưa thanh toán tự hết hạn, nhả chỗ", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page, "mai.tran@example.com");
  await go(page, "/tours/2");
  await page.getByRole("link", { name: /Chọn đợt này/ }).first().or(page.getByRole("button", { name: /Chọn đợt này/ }).first()).click();
  await page.getByRole("button", { name: /Giữ chỗ/ }).click();
  await expect(page.getByText(/Chờ thanh toán/).first()).toBeVisible();
  const bookingUrl = page.url();

  await logout(page);
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "+15 phút" }).click();
  await expect(page.getByTestId("demo-offset")).toContainText("15 phút");

  await logout(page);
  await login(page, "mai.tran@example.com");
  await page.goto(bookingUrl);
  await expect(page.getByText(/Hết hạn/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("bảng DEMO: tự mở lần đầu, đổi vai trò 1 chạm", async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const panel = page.getByRole("dialog", { name: "Hướng dẫn demo" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Quản lý tour · Nguyễn Thu Hà/ }).click();
  await expect(page).toHaveURL(/#\/manager$/);
  await expect(panel).toBeHidden();
  await page.getByRole("button", { name: "DEMO · hướng dẫn" }).click();
  await panel.getByRole("button", { name: /Hướng dẫn viên · Trần Quốc Hưng/ }).click();
  await expect(page).toHaveURL(/#\/operator\/tours/);
  await expect(page.getByText(/Cái Răng/).first()).toBeVisible();
});
