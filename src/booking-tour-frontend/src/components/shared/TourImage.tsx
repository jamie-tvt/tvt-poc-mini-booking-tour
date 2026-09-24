"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export const PLACEHOLDER_IMAGE = "/images/tours/placeholder.svg";

/** Ảnh tour có ảnh dự phòng khi URL hỏng. Dùng <img> vì URL có thể là ngoài hệ thống (manager nhập tay). */
export function TourImage({
  src,
  alt,
  className,
  priority,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? PLACEHOLDER_IMAGE : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={800}
      height={500}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("aspect-[16/10] w-full bg-sky-soft object-cover", className)}
    />
  );
}
