"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Stars } from "@/components/ui/Stars";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/utils/format";
import { adminService } from "../services/adminService";

export function ReviewManager() {
  const [page, setPage] = useState(0);
  const q = useApiQuery(`admin-reviews-${page}`, () => adminService.reviews(page));
  const m = useMutation(adminService.setReviewVisibility);

  async function toggle(id: number, hidden: boolean) {
    const res = await m.run(id, hidden ? "VISIBLE" : "HIDDEN");
    if (res) q.setData((prev) => (prev ? { ...prev, content: prev.content.map((r) => (r.id === id ? { ...r, status: res.status ?? (hidden ? "VISIBLE" : "HIDDEN") } : r)) } : prev));
  }

  return (
    <div>
      <PageHeader title="Đánh giá" description="Ẩn các đánh giá không phù hợp khỏi trang công khai." />
      {m.error && <Alert tone="error" className="mb-4">{m.error.message}</Alert>}
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Chưa có đánh giá" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {q.data.content.map((r) => {
              const hidden = r.status === "HIDDEN";
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.userName}</p>
                      <Stars value={r.rating} />
                      {hidden ? <Badge tone="neutral">Đang ẩn</Badge> : <Badge tone="success">Đang hiển thị</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm">{r.content}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Tour #{r.tourId} · Đơn #{r.bookingId} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <Button size="sm" variant={hidden ? "secondary" : "ghost"} onClick={() => toggle(r.id, hidden)} disabled={m.pending}>
                    {hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                    {hidden ? "Hiện đánh giá" : "Ẩn đánh giá"}
                  </Button>
                </li>
              );
            })}
          </ul>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
