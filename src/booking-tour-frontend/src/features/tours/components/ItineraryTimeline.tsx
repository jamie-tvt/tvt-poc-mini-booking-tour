import { MapPin } from "lucide-react";
import type { ItineraryItemDto } from "@/types/domain";

export function ItineraryTimeline({ items }: { items: ItineraryItemDto[] }) {
  const sorted = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) return <p className="text-ink-soft">Lịch trình đang được cập nhật.</p>;
  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {sorted.map((item, i) => (
        <li key={item.id} className="relative mb-6 pl-8 last:mb-0">
          <span
            className="absolute -left-[15px] top-0 flex size-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white ring-4 ring-bg"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <span className="sr-only">Điểm dừng {i + 1}: </span>
            <MapPin className="size-4 text-cta" aria-hidden="true" />
            {item.placeName}
          </p>
          {item.placeDescription && <p className="mt-1 text-sm text-ink-soft">{item.placeDescription}</p>}
        </li>
      ))}
    </ol>
  );
}
