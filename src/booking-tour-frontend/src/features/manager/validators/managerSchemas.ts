import { z } from "zod";

const intField = (label: string, min: number) =>
  z.coerce
    .number({ error: `${label} phải là số.` })
    .int({ error: `${label} phải là số nguyên.` })
    .min(min, { error: `${label} tối thiểu ${min}.` });

export const tourSchema = z.object({
  tourCode: z
    .string()
    .trim()
    .min(2, { error: "Mã tour tối thiểu 2 ký tự." })
    .max(30, { error: "Mã tour tối đa 30 ký tự." })
    .regex(/^[A-Za-z0-9_-]+$/, { error: "Mã tour chỉ gồm chữ, số, gạch ngang, gạch dưới." }),
  title: z.string().trim().min(5, { error: "Tên tour tối thiểu 5 ký tự." }).max(200, { error: "Tên tour tối đa 200 ký tự." }),
  description: z.string().trim().min(20, { error: "Mô tả tối thiểu 20 ký tự." }),
  destination: z.string().trim().min(2, { error: "Vui lòng nhập điểm đến." }).max(200),
  durationDays: intField("Số ngày", 1),
  maxGuests: intField("Số khách tối đa", 1),
  price: intField("Giá tour", 0),
  categoryId: z.coerce.number({ error: "Vui lòng chọn danh mục." }).int().positive({ error: "Vui lòng chọn danh mục." }),
  coverImageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), { error: "URL ảnh phải bắt đầu bằng http(s):// hoặc /" })
    .transform((v) => (v === "" ? undefined : v)),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"], { error: "Trạng thái không hợp lệ." }),
});
export type TourFormValues = z.input<typeof tourSchema>;

const optionalMoney = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 0), { error: "Giá phải là số nguyên không âm." })
  .transform((v) => (v === "" ? undefined : Number(v)));

/** Form đợt khởi hành: giá bỏ trống → backend lấy giá tour (trẻ em 70%). */
export const departureSchema = z
  .object({
    startAt: z.string().min(1, { error: "Vui lòng chọn ngày giờ đi." }),
    endAt: z.string().min(1, { error: "Vui lòng chọn ngày giờ về." }),
    capacity: intField("Sức chứa", 1),
    adultPrice: optionalMoney,
    childPrice: optionalMoney,
    tourGuideId: z
      .string()
      .transform((v) => (v === "" ? undefined : Number(v))),
  })
  .refine((v) => !v.startAt || !v.endAt || v.endAt > v.startAt, {
    path: ["endAt"],
    error: "Ngày về phải sau ngày đi.",
  });
export type DepartureFormValues = z.input<typeof departureSchema>;
