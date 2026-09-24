import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type {
  AuditLogDto,
  DashboardDto,
  DemoClockDto,
  PaymentDto,
  PaymentStatus,
  ReviewDto,
  ReviewStatus,
  Role,
  SettingDto,
  UserDto,
} from "@/types/domain";

export const adminService = {
  dashboard: () => api.get<DashboardDto>("/admin/dashboard"),

  users: (q: { keyword?: string; role?: Role; page: number; size?: number }) =>
    api.get<PageResponse<UserDto>>("/admin/users", { ...q, size: q.size ?? 10 }),
  createUser: (p: { fullName: string; email: string; password: string; phone?: string; role: Role }) => api.post<UserDto>("/admin/users", p),
  updateUser: (id: number, p: { fullName: string; phone?: string; role: Role }) => api.put<UserDto>(`/admin/users/${id}`, p),
  setActive: (id: number, active: boolean) => api.put<UserDto>(`/admin/users/${id}/active`, { active }),

  payments: (q: { status?: PaymentStatus; page: number; size?: number }) =>
    api.get<PageResponse<PaymentDto>>("/admin/payments", { ...q, size: q.size ?? 10 }),
  verifyPayment: (id: number) => api.post<PaymentDto>(`/payments/${id}/verify`),
  refundPayment: (id: number) => api.post<PaymentDto>(`/payments/${id}/refund`),
  cancelPayment: (id: number) => api.post<PaymentDto>(`/payments/${id}/cancel`),

  reviews: (page: number, size = 10) => api.get<PageResponse<ReviewDto>>("/admin/reviews", { page, size }),
  setReviewVisibility: (id: number, status: ReviewStatus) => api.put<ReviewDto>(`/admin/reviews/${id}/visibility`, { status }),

  settings: () => api.get<SettingDto[]>("/admin/settings"),
  saveSettings: (items: { key: string; value: string }[]) => api.put<SettingDto[]>("/admin/settings", { items }),

  auditLogs: (page: number, size = 20) => api.get<AuditLogDto[] | PageResponse<AuditLogDto>>("/admin/audit-logs", { page, size }),

  clock: () => api.get<DemoClockDto>("/demo/clock", undefined, { auth: false }),
  setClock: (offsetMinutes: number) => api.post<DemoClockDto>("/demo/clock", { offsetMinutes }),
  expireNow: () => api.post<unknown>("/demo/expire-now"),
};
