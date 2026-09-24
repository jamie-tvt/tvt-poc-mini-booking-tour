import { AreaShell } from "@/components/layout/AreaShell";
import { RequireAuth } from "@/components/shared/RequireAuth";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={["TOUR_GUIDE"]}>
      <AreaShell title="Hướng dẫn viên" navKey="operator">
        {children}
      </AreaShell>
    </RequireAuth>
  );
}
