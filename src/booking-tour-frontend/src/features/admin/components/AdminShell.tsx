"use client";

import { usePathname } from "next/navigation";
import { AreaShell } from "@/components/layout/AreaShell";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { allowedRolesForPath } from "@/lib/auth/roles";
import { adminNav } from "@/lib/config/navigation";

/** /admin: ADMIN toàn quyền; TOUR_MANAGER (Staff) xem dashboard, đơn đặt tour, đánh giá. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const { user } = useAuth();
  return (
    <RequireAuth roles={allowedRolesForPath(pathname)}>
      <AreaShell title="Quản trị" nav={adminNav(user?.role ?? null)}>
        {children}
      </AreaShell>
    </RequireAuth>
  );
}
