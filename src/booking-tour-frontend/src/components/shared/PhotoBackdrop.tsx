import { cn } from "@/lib/utils/cn";
import { unsplashVariant } from "@/lib/utils/images";

/**
 * Nền mờ lấy màu từ chính ảnh tour: bản nhỏ w=64 (vài KB) phóng to + blur 48px, phủ lớp màu nền để chữ đạt ≥ 4.5:1.
 * Không dùng hook → dùng được trong Server Component. Cha cần `relative isolate` (nền nằm ở -z-10, dưới nội dung).
 * - tone "page": gradient màu nền trang 55% → 82% → 100% (hoà vào nền ở mép dưới).
 * - tone "card": phủ trắng 80%.
 * Ảnh lỗi (mất mạng) → <img alt=""> không hiện gì, chỉ còn lớp phủ. prefers-reduced-transparency → nền đặc (globals.css).
 */
export function PhotoBackdrop({ src, className, tone = "page" }: { src?: string | null; className?: string; tone?: "page" | "card" }) {
  if (!src) return null;
  return (
    <div aria-hidden="true" className={cn("photo-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={unsplashVariant(src, 64, 40)}
        alt=""
        loading="lazy"
        decoding="async"
        className="photo-backdrop__img absolute inset-[-10%] h-[120%] w-[120%] max-w-none scale-110 object-cover blur-[48px] saturate-[1.4]"
      />
      <div
        className={cn(
          "photo-backdrop__veil absolute inset-0",
          tone === "page" ? "bg-gradient-to-b from-bg/55 via-bg/82 to-bg" : "bg-white/80",
        )}
      />
    </div>
  );
}
