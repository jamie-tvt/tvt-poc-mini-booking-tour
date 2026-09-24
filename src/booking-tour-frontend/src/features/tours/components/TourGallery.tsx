"use client";

import { useState } from "react";
import { TourImage } from "@/components/shared/TourImage";
import { cn } from "@/lib/utils/cn";

export function TourGallery({ title, cover, images }: { title: string; cover?: string; images: { id: number; imageUrl: string }[] }) {
  const all = [...(cover ? [{ id: -1, imageUrl: cover }] : []), ...images.filter((i) => i.imageUrl !== cover)];
  const [active, setActive] = useState(0);
  const current = all[active];
  return (
    <div className="flex flex-col gap-3">
      <TourImage
        key={current?.imageUrl}
        src={current?.imageUrl}
        alt={`Ảnh minh hoạ tour ${title}`}
        priority
        width={1200}
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="rounded-2xl shadow-float"
      />
      {all.length > 1 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Ảnh khác của tour">
          {all.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-pressed={i === active}
                className={cn(
                  "block w-full overflow-hidden rounded-lg ring-2 transition duration-200",
                  i === active ? "ring-brand" : "ring-transparent hover:ring-line-strong",
                )}
              >
                <TourImage src={img.imageUrl} alt="" width={320} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
