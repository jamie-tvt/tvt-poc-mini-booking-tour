"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { fallbackImageFor, unsplashSrcSet, unsplashVariant } from "@/lib/utils/images";

export const PLACEHOLDER_IMAGE = "/images/tours/placeholder.svg";

/**
 * Ảnh tour có ảnh dự phòng khi URL hỏng. Dùng <img> vì URL có thể là ngoài hệ thống (manager nhập tay).
 * Ảnh Unsplash: lấy đúng cỡ (w=800 cho thẻ, 1200 cho chi tiết); lỗi → SVG minh hoạ cùng chủ đề → placeholder.
 */
export function TourImage({
  src,
  alt,
  className,
  priority,
  width = 800,
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Bề rộng ảnh xin từ CDN; có `sizes` thì dùng srcSet 800/1200/1600. */
  width?: number;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(0);
  const fallback = fallbackImageFor(src);
  const url = !src || failed >= 2 || (failed === 1 && !fallback) ? PLACEHOLDER_IMAGE : failed === 1 ? fallback! : unsplashVariant(src, width);
  const srcSet = failed === 0 && sizes ? unsplashSrcSet(src) : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={800}
      height={500}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed((n) => (url === PLACEHOLDER_IMAGE ? 3 : n + 1))}
      className={cn("aspect-[16/10] w-full bg-sky-soft object-cover", className)}
    />
  );
}
