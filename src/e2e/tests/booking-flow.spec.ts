import { expect, test } from "@playwright/test";
import { createTripForGuide, uiLogin } from "./helpers";

/**
 * Kịch bản nghiệm thu Mức 1 (docs/qa/test-plan.md E2E-01):
 * khách mới đăng ký → đặt 2 vé → thanh toán qua cổng giả lập → HDV bắt đầu/kết thúc tour → khách đánh giá.
 */
test("khách đặt tour, thanh toán, HDV kết thúc tour, khách đánh giá", async ({ page, request }) => {
  const { tour } = await createTripForGuide(request);
  const email = `e2e-${Date.now()}@example.com`;

  await test.step("Đăng ký tài khoản mới", async () => {
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Khách Kiểm Thử");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/^Mật khẩu/).fill("12345678");
    await page.getByLabel("Nhập lại mật khẩu").fill("12345678");
    await page.getByRole("button", { name: /Đăng ký|Tạo tài khoản/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step("Đăng nhập và chọn đợt khởi hành", async () => {
    await uiLogin(page, email);
    await page.goto(`/tours/${tour.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(tour.title);
    await page.getByRole("link", { name: /Chọn đợt này/ }).first().or(page.getByRole("button", { name: /Chọn đợt này/ }).first()).click();
    await expect(page).toHaveURL(/\/booking/);
  });

  await test.step("Chọn 2 vé người lớn và giữ chỗ", async () => {
    await page.getByRole("button", { name: "Tăng số vé người lớn" }).click();
    await expect(page.getByRole("spinbutton", { name: "Số vé người lớn" })).toHaveValue("2");
    await expect(page.getByText(/1\.000\.000\s*₫/).first()).toBeVisible();
    await page.getByRole("button", { name: /Giữ chỗ/ }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);
    await expect(page.getByText(/Chờ thanh toán/).first()).toBeVisible();
  });

  const bookingUrl = page.url();
  await test.step("Thanh toán qua cổng giả lập", async () => {
    await page.getByRole("button", { name: /^Thanh toán/ }).first().click();
    await expect(page).toHaveURL(/\/pay\/mock\/\d+/);
    await page.getByRole("button", { name: /Thanh toán thành công/ }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);
    await expect(page.getByText(/Đã xác nhận/).first()).toBeVisible({ timeout: 15_000 });
  });

  await test.step("HDV bắt đầu và kết thúc tour", async () => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await uiLogin(page, "tuan.guide@example.com");
    await page.goto("/operator/tours");
    await page.getByRole("link", { name: new RegExp(tour.title) }).first().click();
    await page.getByRole("button", { name: /Bắt đầu tour/ }).click();
    await page.getByRole("button", { name: "Xác nhận bắt đầu" }).click();
    await expect(page.getByRole("button", { name: /Kết thúc tour/ })).toBeVisible();
    await page.getByRole("button", { name: /Kết thúc tour/ }).click();
    await page.getByRole("button", { name: "Xác nhận kết thúc" }).click();
    await expect(page.getByText(/Đã hoàn thành/).first()).toBeVisible();
  });

  await test.step("Khách đánh giá chuyến đi", async () => {
    await page.evaluate(() => localStorage.clear());
    await uiLogin(page, email);
    await page.goto(bookingUrl);
    await expect(page.getByText(/Đã hoàn thành/).first()).toBeVisible();
    await page.getByRole("radio", { name: "5 sao" }).check({ force: true }); // input sr-only, người dùng bấm vào ngôi sao
    await page.getByLabel("Cảm nhận của bạn").fill("Hướng dẫn viên nhiệt tình, lịch trình hợp lý.");
    await page.getByRole("button", { name: /Gửi đánh giá/ }).click();
    await expect(page.getByText(/Cảm ơn bạn đã gửi đánh giá/).first()).toBeVisible();
  });
});

test("khách chưa đăng nhập bị chuyển sang trang đăng nhập khi đặt tour", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("khách không vào được trang quản trị", async ({ page }) => {
  await uiLogin(page, "mai.tran@example.com");
  await page.goto("/admin/users");
  await expect(page.getByText(/không có quyền|Không có quyền/).first()).toBeVisible();
});
