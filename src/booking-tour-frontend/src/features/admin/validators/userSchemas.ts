import { z } from "zod";
import { optionalPhone } from "@/features/auth/validators/authSchemas";

const role = z.enum(["CUSTOMER", "TOUR_GUIDE", "TOUR_MANAGER", "ADMIN"], { error: "Vui lòng chọn vai trò." });

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Họ tên tối thiểu 2 ký tự." }).max(100),
  email: z.string().trim().pipe(z.email({ error: "Email không đúng định dạng." })),
  password: z.string().min(8, { error: "Mật khẩu tối thiểu 8 ký tự." }),
  phone: optionalPhone,
  role,
});
export type CreateUserValues = z.input<typeof createUserSchema>;
