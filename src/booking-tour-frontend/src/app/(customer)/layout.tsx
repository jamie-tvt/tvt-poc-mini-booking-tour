import { SiteFooter } from "@/components/layout/SiteFooter";
import { RequireAuth } from "@/components/shared/RequireAuth";

/** Khu vực cần đăng nhập (mọi vai trò); từng trang tự giới hạn vai trò nếu cần. */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <RequireAuth>{children}</RequireAuth>
      </div>
      <SiteFooter />
    </>
  );
}
