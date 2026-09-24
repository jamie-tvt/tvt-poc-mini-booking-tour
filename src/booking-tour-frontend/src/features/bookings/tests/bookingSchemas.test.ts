import { describe, expect, it } from "vitest";
import { zodFieldErrors } from "@/lib/utils/validation";
import { calcBookingTotal } from "../services/bookingService";
import { createBookingSchema, reviewSchema } from "../validators/bookingSchemas";

describe("createBookingSchema", () => {
  const schema = createBookingSchema(5);

  it("hợp lệ khi ≥ 1 người lớn và tổng vé ≤ chỗ còn", () => {
    expect(schema.safeParse({ departureId: 7, adultQuantity: 2, childQuantity: 3 }).success).toBe(true);
    expect(schema.safeParse({ departureId: 7, adultQuantity: 1, childQuantity: 0 }).success).toBe(true);
  });

  it("cần ít nhất 1 người lớn", () => {
    const r = schema.safeParse({ departureId: 7, adultQuantity: 0, childQuantity: 2 });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).adultQuantity).toBe("Cần ít nhất 1 vé người lớn.");
  });

  it("trẻ em không âm, số vé phải nguyên", () => {
    expect(schema.safeParse({ departureId: 7, adultQuantity: 1, childQuantity: -1 }).success).toBe(false);
    expect(schema.safeParse({ departureId: 7, adultQuantity: 1.5, childQuantity: 0 }).success).toBe(false);
  });

  it("không vượt số chỗ còn", () => {
    const r = schema.safeParse({ departureId: 7, adultQuantity: 4, childQuantity: 2 });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).total).toBe("Đợt này chỉ còn 5 chỗ trống.");
  });

  it("báo hết chỗ khi còn 0", () => {
    const r = createBookingSchema(0).safeParse({ departureId: 7, adultQuantity: 1, childQuantity: 0 });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).total).toBe("Đợt này đã hết chỗ.");
  });

  it("thiếu đợt khởi hành", () => {
    expect(schema.safeParse({ departureId: 0, adultQuantity: 1, childQuantity: 0 }).success).toBe(false);
  });
});

describe("reviewSchema", () => {
  it("sao 1–5 và nội dung ≥ 10 ký tự", () => {
    expect(reviewSchema.safeParse({ rating: 5, content: "Chuyến đi rất tuyệt vời!" }).success).toBe(true);
    const r = reviewSchema.safeParse({ rating: 0, content: "  ngắn  " });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = zodFieldErrors(r.error);
      expect(errs.rating).toBe("Vui lòng chọn từ 1 đến 5 sao.");
      expect(errs.content).toBe("Nội dung đánh giá tối thiểu 10 ký tự.");
    }
  });
});

describe("calcBookingTotal", () => {
  it("tổng = NL × giá NL + TE × giá TE", () => {
    expect(calcBookingTotal(2, 1, 1650000, 1155000)).toBe(4455000);
    expect(calcBookingTotal(1, 0, 990000, 693000)).toBe(990000);
    expect(calcBookingTotal(-1, -2, 100, 50)).toBe(0);
  });
});
