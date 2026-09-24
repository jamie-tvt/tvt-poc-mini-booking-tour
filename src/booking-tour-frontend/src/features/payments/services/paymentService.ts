import { api } from "@/lib/api/client";
import type { PaymentDto } from "@/types/domain";

export const paymentService = {
  get: (id: number | string) => api.get<PaymentDto>(`/payments/${id}`),
  completeMock: (id: number | string, result: "SUCCESS" | "FAILED") =>
    api.post<unknown>(`/payments/mock/${id}/complete`, { result }),
};
