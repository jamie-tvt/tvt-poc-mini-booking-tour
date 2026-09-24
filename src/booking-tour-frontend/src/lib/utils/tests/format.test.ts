import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDateWithWeekday,
  formatDuration,
  formatNumber,
  formatRating,
  formatTime,
  formatVnd,
  fromVnDateTimeInput,
  toVnDateTimeInput,
} from "../format";

const NBSP = " ";

describe("formatVnd", () => {
  it("định dạng tiền VND có dấu chấm phân cách nghìn và ký hiệu ₫", () => {
    expect(formatVnd(1650000)).toBe(`1.650.000${NBSP}₫`);
    expect(formatVnd(0)).toBe(`0${NBSP}₫`);
    expect(formatVnd(999)).toBe(`999${NBSP}₫`);
    expect(formatVnd(1000)).toBe(`1.000${NBSP}₫`);
    expect(formatVnd(12345678901)).toBe(`12.345.678.901${NBSP}₫`);
  });

  it("làm tròn số lẻ và giữ dấu âm", () => {
    expect(formatVnd(1155000.4)).toBe(`1.155.000${NBSP}₫`);
    expect(formatVnd(-250000)).toBe(`-250.000${NBSP}₫`);
  });

  it("trả gạch ngang khi không có giá trị", () => {
    expect(formatVnd(undefined)).toBe("—");
    expect(formatVnd(null)).toBe("—");
    expect(formatVnd(Number.NaN)).toBe("—");
  });

  it("formatNumber không kèm đơn vị", () => {
    expect(formatNumber(31)).toBe("31");
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
});

describe("ngày giờ theo múi giờ Asia/Ho_Chi_Minh", () => {
  // 07:00 UTC = 14:00 giờ Việt Nam
  const iso = "2026-10-05T07:00:00Z";

  it("formatDate / formatTime / formatDateTime quy đổi sang GMT+7", () => {
    expect(formatDate(iso)).toBe("05/10/2026");
    expect(formatTime(iso)).toBe("14:00");
    expect(formatDateTime(iso)).toBe("14:00 05/10/2026");
  });

  it("qua nửa đêm UTC+7 thì sang ngày mới", () => {
    expect(formatDate("2026-10-05T17:30:00Z")).toBe("06/10/2026");
    expect(formatTime("2026-10-05T17:30:00Z")).toBe("00:30");
  });

  it("thứ trong tuần tiếng Việt", () => {
    expect(formatDateWithWeekday(iso)).toBe("Thứ Hai, 05/10/2026");
  });

  it("khoảng ngày đi – về", () => {
    expect(formatDateRange("2026-10-05T00:00:00Z", "2026-10-07T10:00:00Z")).toBe("05/10/2026 – 07/10/2026");
  });

  it("giá trị rỗng/không hợp lệ trả gạch ngang", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime("không phải ngày")).toBe("—");
  });

  it("chuyển qua lại với input datetime-local theo giờ Việt Nam", () => {
    expect(toVnDateTimeInput(iso)).toBe("2026-10-05T14:00");
    expect(fromVnDateTimeInput("2026-10-05T14:00")).toBe(iso);
    expect(fromVnDateTimeInput("")).toBe("");
    expect(fromVnDateTimeInput(toVnDateTimeInput("2026-12-31T20:15:00Z"))).toBe("2026-12-31T20:15:00Z");
  });
});

describe("tiện ích hiển thị khác", () => {
  it("formatDuration", () => {
    expect(formatDuration(1)).toBe("1 ngày");
    expect(formatDuration(3)).toBe("3 ngày 2 đêm");
    expect(formatDuration(0)).toBe("—");
  });

  it("formatCountdown", () => {
    expect(formatCountdown(15 * 60_000)).toBe("15:00");
    expect(formatCountdown(65_500)).toBe("01:05");
    expect(formatCountdown(3_723_000)).toBe("1:02:03");
    expect(formatCountdown(-5000)).toBe("00:00");
  });

  it("formatRating dùng dấu phẩy thập phân", () => {
    expect(formatRating(4.666)).toBe("4,7");
    expect(formatRating(5)).toBe("5,0");
    expect(formatRating(undefined)).toBe("—");
  });
});
