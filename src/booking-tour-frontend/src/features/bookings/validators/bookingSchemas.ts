import { z } from "zod";

/** Đặt tour: ≥ 1 người lớn, trẻ em ≥ 0, tổng vé không vượt số chỗ còn. */
export function createBookingSchema(availableSeats: number) {
  return z
    .object({
      departureId: z.number({ error: "Thiếu đợt khởi hành." }).int().positive({ error: "Thiếu đợt khởi hành." }),
      adultQuantity: z
        .number({ error: "Số vé người lớn không hợp lệ." })
        .int({ error: "Số vé người lớn phải là số nguyên." })
        .min(1, { error: "Cần ít nhất 1 vé người lớn." }),
      childQuantity: z
        .number({ error: "Số vé trẻ em không hợp lệ." })
        .int({ error: "Số vé trẻ em phải là số nguyên." })
        .min(0, { error: "Số vé trẻ em không được âm." }),
    })
    .refine((v) => v.adultQuantity + v.childQuantity <= availableSeats, {
      path: ["total"],
      error: availableSeats > 0 ? `Đợt này chỉ còn ${availableSeats} chỗ trống.` : "Đợt này đã hết chỗ.",
    });
}
export type BookingInput = z.infer<ReturnType<typeof createBookingSchema>>;

export const reviewSchema = z.object({
  rating: z
    .number({ error: "Vui lòng chọn số sao." })
    .int()
    .min(1, { error: "Vui lòng chọn từ 1 đến 5 sao." })
    .max(5, { error: "Vui lòng chọn từ 1 đến 5 sao." }),
  content: z
    .string()
    .trim()
    .min(10, { error: "Nội dung đánh giá tối thiểu 10 ký tự." })
    .max(2000, { error: "Nội dung đánh giá tối đa 2000 ký tự." }),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
