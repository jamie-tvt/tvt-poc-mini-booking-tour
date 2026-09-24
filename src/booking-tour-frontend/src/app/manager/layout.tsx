import { AreaShell } from "@/components/layout/AreaShell";
import { RequireAuth } from "@/components/shared/RequireAuth";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={["TOUR_MANAGER", "ADMIN"]}>
      <AreaShell title="Quản lý tour" navKey="manager">
        {children}
      </AreaShell>
    </RequireAuth>
  );
}
