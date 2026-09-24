import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, { error: "Vui lòng nhập email." })
  .pipe(z.email({ error: "Email không đúng định dạng." }));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Vui lòng nhập mật khẩu." }),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (bỏ trống được). */
export const VN_PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || VN_PHONE_REGEX.test(v.replace(/[\s.]/g, "")), {
    error: "Số điện thoại không hợp lệ (VD 0901234567).",
  })
  .transform((v) => (v === "" ? undefined : v.replace(/[\s.]/g, "")));

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Họ tên tối thiểu 2 ký tự." })
      .max(100, { error: "Họ tên tối đa 100 ký tự." }),
    email,
    password: z
      .string()
      .min(8, { error: "Mật khẩu tối thiểu 8 ký tự." })
      .max(100, { error: "Mật khẩu tối đa 100 ký tự." }),
    confirmPassword: z.string().min(1, { error: "Vui lòng nhập lại mật khẩu." }),
    phone: optionalPhone,
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    error: "Mật khẩu nhập lại không khớp.",
  });
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterPayload = z.output<typeof registerSchema>;

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Họ tên tối thiểu 2 ký tự." })
    .max(100, { error: "Họ tên tối đa 100 ký tự." }),
  phone: optionalPhone,
  address: z
    .string()
    .trim()
    .max(255, { error: "Địa chỉ tối đa 255 ký tự." })
    .transform((v) => (v === "" ? undefined : v)),
});
export type ProfileInput = z.input<typeof profileSchema>;
