import type { Role } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  /** khớp chính xác đường dẫn thay vì theo tiền tố */
  exact?: boolean;
  /** quy tắc khớp riêng (ưu tiên hơn exact) */
  match?: RegExp;
}

/** Menu header theo vai trò. */
export function headerNav(role: Role | null): NavItem[] {
  const base: NavItem[] = [{ href: "/tours", label: "Khám phá tour" }];
  switch (role) {
    case "CUSTOMER":
      return [...base, { href: "/bookings", label: "Đơn của tôi" }];
    case "TOUR_GUIDE":
      return [...base, { href: "/operator/tours", label: "Lịch dẫn tour" }];
    case "TOUR_MANAGER":
      return [...base, { href: "/manager", label: "Quản lý tour" }, { href: "/admin", label: "Tổng quan", exact: true }];
    case "ADMIN":
      return [...base, { href: "/admin", label: "Quản trị" }, { href: "/manager", label: "Quản lý tour" }];
    default:
      return base;
  }
}

export const MANAGER_NAV: NavItem[] = [
  { href: "/manager", label: "Tour", match: /^\/manager(\/tours\/\d+.*)?$/ },
  { href: "/manager/tours/new", label: "Tạo tour mới" },
  { href: "/manager/categories", label: "Danh mục" },
  { href: "/manager/places", label: "Địa điểm" },
  { href: "/manager/bookings", label: "Đơn đặt tour" },
];

export const OPERATOR_NAV: NavItem[] = [{ href: "/operator/tours", label: "Đợt được phân công" }];

export function adminNav(role: Role | null): NavItem[] {
  const all: (NavItem & { roles: Role[] })[] = [
    { href: "/admin", label: "Tổng quan", exact: true, roles: ["ADMIN", "TOUR_MANAGER"] },
    { href: "/admin/users", label: "Người dùng", roles: ["ADMIN"] },
    { href: "/admin/bookings", label: "Đơn đặt tour", roles: ["ADMIN", "TOUR_MANAGER"] },
    { href: "/admin/payments", label: "Thanh toán", roles: ["ADMIN"] },
    { href: "/admin/reviews", label: "Đánh giá", roles: ["ADMIN", "TOUR_MANAGER"] },
    { href: "/admin/settings", label: "Cài đặt", roles: ["ADMIN"] },
    { href: "/admin/audit-logs", label: "Nhật ký hệ thống", roles: ["ADMIN"] },
  ];
  return all.filter((i) => role && i.roles.includes(role)).map(({ roles: _r, ...rest }) => rest);
}

export function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match.test(pathname);
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
