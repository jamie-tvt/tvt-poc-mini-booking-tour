import type { Role } from "@/types/domain";

export const STAFF_ROLES: Role[] = ["TOUR_MANAGER", "ADMIN"];

export function isStaff(role: Role | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

/** Trang mặc định sau đăng nhập theo vai trò. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "TOUR_GUIDE":
      return "/operator/tours";
    case "TOUR_MANAGER":
      return "/manager";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}

/** Vai trò được vào từng khu vực (guard ở layout client). */
export function allowedRolesForPath(pathname: string): Role[] | null {
  if (pathname.startsWith("/manager")) return ["TOUR_MANAGER", "ADMIN"];
  if (pathname.startsWith("/operator")) return ["TOUR_GUIDE"];
  if (pathname.startsWith("/admin")) {
    const staffPages = ["/admin", "/admin/bookings", "/admin/reviews"];
    const isStaffPage = pathname === "/admin" || staffPages.slice(1).some((p) => pathname.startsWith(p));
    return isStaffPage ? ["TOUR_MANAGER", "ADMIN"] : ["ADMIN"];
  }
  return null;
}
