/**
 * Ảnh tour lưu dạng link CDN Unsplash: https://images.unsplash.com/<photo-id>?auto=format&fit=crop&w=1200&q=75
 * CDN tự nén WebP/AVIF và cắt theo w/q → thẻ dùng w=800, chi tiết w=1200, nền mờ w=64.
 */
const UNSPLASH_HOST = "images.unsplash.com";

/** Ảnh Unsplash → đổi w (và q); URL khác (SVG local, link quản lý tự nhập) giữ nguyên. */
export function unsplashVariant(url: string, width: number, quality?: number): string;
export function unsplashVariant(url: string | null | undefined, width: number, quality?: number): string | undefined;
export function unsplashVariant(url: string | null | undefined, width: number, quality?: number): string | undefined {
  if (!url) return undefined;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url; // đường dẫn tương đối /images/...
  }
  if (u.hostname !== UNSPLASH_HOST) return url;
  u.searchParams.set("w", String(Math.round(width)));
  if (quality !== undefined) u.searchParams.set("q", String(Math.round(quality)));
  return u.toString();
}

/** srcSet 800/1200/1600 cho ảnh Unsplash; ảnh khác không cần srcSet. */
export function unsplashSrcSet(url: string | null | undefined, widths: number[] = [800, 1200, 1600]): string | undefined {
  if (!url || widths.length === 0 || unsplashVariant(url, widths[0] ?? 800) === url) return undefined;
  return widths.map((w) => `${unsplashVariant(url, w)} ${w}w`).join(", ");
}

/**
 * Ảnh seed (Unsplash License — ghi công tác giả) ↔ SVG minh hoạ cũ trong public/images/tours.
 * Mất mạng / CDN lỗi → hiện SVG cùng chủ đề thay vì ảnh trống.
 */
const SEED_PHOTO_FALLBACK: Record<string, string> = {
  "photo-1689760661307-ea43aa8114e5": "cai-rang", // Monika Guzikowska
  "photo-1624937195771-358add2e0d9d": "con-son", // Trang Trinh
  "photo-1589562337460-9d825d2cd5a2": "lung-ngoc-hoang", // Mike Swigunski
  "photo-1589556183130-530470785fab": "mui-ca-mau", // Timothy K
  "photo-1650197404160-8d08f76002c0": "soc-trang", // Mộc Đăng Khoa
  "photo-1732243395944-cb3ff9311091": "phu-quoc", // Vivu Vietnam
  "photo-1580630873708-e0475b1856c4": "tra-su", // diGital Sennin
  "photo-1729568664729-1f2f44e53320": "bac-lieu", // Thompson Le
};

/** Ảnh hero trang chủ — Long (lTiga) Nguyen · Unsplash License. */
export const HOME_HERO_IMAGE = "https://images.unsplash.com/photo-1744760654110-c0befa6f57b3?auto=format&fit=crop&w=1600&q=75";

/** Đường dẫn ảnh local trong public/ (bản offline-demo thay bằng data URL lúc build). */
export const localImage = (path: string): string => path;

/** SVG dự phòng theo ảnh seed; không nhận ra ảnh thì trả undefined (dùng placeholder chung). */
export function fallbackImageFor(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const id = url.match(/photo-[0-9]+-[0-9a-f]+/)?.[0];
  const slug = id ? SEED_PHOTO_FALLBACK[id] : undefined;
  return slug ? localImage(`/images/tours/${slug}.svg`) : undefined;
}
