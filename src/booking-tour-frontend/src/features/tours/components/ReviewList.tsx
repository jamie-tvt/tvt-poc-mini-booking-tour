import { Stars } from "@/components/ui/Stars";
import { formatDate } from "@/lib/utils/format";
import type { ReviewDto } from "@/types/domain";

export function ReviewList({ reviews }: { reviews: ReviewDto[] }) {
  if (reviews.length === 0) return <p className="text-ink-soft">Chưa có đánh giá nào cho tour này.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{r.userName}</p>
            <p className="text-xs text-ink-soft">{formatDate(r.createdAt)}</p>
          </div>
          <Stars value={r.rating} className="mt-1" />
          <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.content}</p>
        </li>
      ))}
    </ul>
  );
}
