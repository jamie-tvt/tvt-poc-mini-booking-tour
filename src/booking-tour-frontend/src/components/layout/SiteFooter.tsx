import Link from "next/link";
import { Compass, Mail, MapPin, Phone } from "lucide-react";
import { APP_NAME } from "@/lib/config/env";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
            <Compass className="size-5 text-brand" aria-hidden="true" /> {APP_NAME}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Tour miền Tây và biển đảo phía Nam — đặt nhanh, giữ chỗ tức thì, thanh toán an toàn.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">Khám phá</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link href="/tours" className="text-ink-soft underline-offset-4 hover:text-brand hover:underline">
                Tất cả tour
              </Link>
            </li>
            <li>
              <Link href="/bookings" className="text-ink-soft underline-offset-4 hover:text-brand hover:underline">
                Đơn của tôi
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ink">Liên hệ</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <MapPin className="size-4" aria-hidden="true" /> Ninh Kiều, Cần Thơ
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4" aria-hidden="true" /> 1900 0000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4" aria-hidden="true" /> hotro@mekongtour.vn
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-ink-soft">
        © 2026 {APP_NAME} — Dự án mẫu POC Booking Tour (môi trường demo).
      </p>
    </footer>
  );
}
