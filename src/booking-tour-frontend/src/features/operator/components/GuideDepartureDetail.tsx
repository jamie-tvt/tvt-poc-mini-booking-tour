"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Flag, Play } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorState } from "@/components/shared/ErrorState";
import { BookingStatusBadge } from "@/features/bookings/components/BookingStatusBadge";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/utils/format";
import { DEPARTURE_STATUS } from "@/lib/utils/labels";
import { operatorService } from "../services/operatorService";

type Action = "start" | "finish";

export function GuideDepartureDetail({ id }: { id: string }) {
  const q = useApiQuery(`guide-dep-${id}`, () => operatorService.departure(id));
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const m = useMutation((a: Action, depId: number) => (a === "start" ? operatorService.start(depId) : operatorService.finish(depId)));

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const { departure: d, tourTitle, passengers } = q.data;
  const totalGuests = passengers.reduce((s, p) => s + p.adultQuantity + p.childQuantity, 0);

  async function run() {
    if (!confirm) return;
    const res = await m.run(confirm, d.id);
    if (res !== undefined) {
      setNotice(confirm === "start" ? "Tour đã bắt đầu. Chúc chuyến đi thuận lợi!" : "Tour đã kết thúc. Khách sẽ nhận lời mời đánh giá.");
      setConfirm(null);
      void q.reload();
    }
  }

  return (
    <div>
      <Link href="/operator/tours" className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Đợt được phân công
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{tourTitle ?? d.tourTitle}</h1>
        <Badge tone={DEPARTURE_STATUS[d.status].tone}>{DEPARTURE_STATUS[d.status].label}</Badge>
        <div className="flex gap-2 sm:ml-auto">
          {d.status === "OPEN" && (
            <Button variant="cta" onClick={() => setConfirm("start")}>
              <Play className="size-4" aria-hidden="true" /> Bắt đầu tour
            </Button>
          )}
          {d.status === "IN_PROGRESS" && (
            <Button onClick={() => setConfirm("finish")}>
              <Flag className="size-4" aria-hidden="true" /> Kết thúc tour
            </Button>
          )}
        </div>
      </div>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      {m.error && !confirm && <Alert tone="error" className="mb-4">{m.error.message}</Alert>}

      <Card className="mb-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-soft">Khởi hành</dt>
            <dd className="font-semibold">{formatDateTime(d.startAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Kết thúc</dt>
            <dd className="font-semibold">{formatDateTime(d.endAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Số đơn</dt>
            <dd className="font-semibold">{passengers.length}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Tổng khách</dt>
            <dd className="font-semibold">
              {totalGuests} / {d.capacity}
            </dd>
          </div>
        </dl>
      </Card>

      <h2 className="mb-3 text-xl font-bold">Danh sách khách</h2>
      {passengers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-white p-4 text-ink-soft">Chưa có khách đã xác nhận cho đợt này.</p>
      ) : (
        <Table caption="Danh sách khách của đợt">
          <thead>
            <tr>
              <Th>Mã đơn</Th>
              <Th>Họ tên</Th>
              <Th>Điện thoại</Th>
              <Th>Người lớn</Th>
              <Th>Trẻ em</Th>
              <Th>Trạng thái</Th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((p) => (
              <tr key={p.bookingCode}>
                <Td className="font-mono text-xs font-semibold">{p.bookingCode}</Td>
                <Td>{p.fullName}</Td>
                <Td>{p.phone ? <a href={`tel:${p.phone}`} className="text-brand hover:underline">{p.phone}</a> : "—"}</Td>
                <Td>{p.adultQuantity}</Td>
                <Td>{p.childQuantity}</Td>
                <Td>
                  <BookingStatusBadge status={p.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => {
          setConfirm(null);
          m.reset();
        }}
        title={confirm === "start" ? "Bắt đầu tour?" : "Kết thúc tour?"}
        description={confirm === "start"
          ? "Đơn chưa thanh toán sẽ chuyển sang Hết hạn. Chỉ bắt đầu được từ 1 ngày trước giờ khởi hành."
          : "Mọi đơn đã xác nhận sẽ chuyển sang Hoàn thành và khách nhận lời mời đánh giá."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Quay lại
            </Button>
            <Button variant={confirm === "start" ? "cta" : "primary"} onClick={run} loading={m.pending}>
              {confirm === "start" ? "Xác nhận bắt đầu" : "Xác nhận kết thúc"}
            </Button>
          </>
        }
      >
        {m.error && <Alert tone="error">{m.error.message}</Alert>}
      </Dialog>
    </div>
  );
}
