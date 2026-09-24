import { MapPinOff } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function NotFound() {
  return (
    <>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
        <MapPinOff className="size-14 text-sky" aria-hidden="true" />
        <p className="font-heading text-5xl font-bold text-brand">404</p>
        <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
        <p className="text-ink-soft">Trang bạn tìm có thể đã bị xoá, đổi địa chỉ hoặc tour không còn mở bán.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <LinkButton href="/">Về trang chủ</LinkButton>
          <LinkButton href="/tours" variant="secondary">
            Xem danh sách tour
          </LinkButton>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
