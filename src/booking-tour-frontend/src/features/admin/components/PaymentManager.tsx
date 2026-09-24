"use client";

import { useState } from "react";
import { Ban, BadgeCheck, Undo2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentStatusBadge } from "@/features/bookings/components/BookingStatusBadge";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import { PAYMENT_STATUS, PAYMENT_STATUSES } from "@/lib/utils/labels";
import type { PaymentDto, PaymentStatus } from "@/types/domain";
import { adminService } from "../services/adminService";

type Action = "verify" | "refund" | "cancel";
const ACTION_META: Record<Action, { title: string; confirm: string; body: string; done: string }> = {
  verify: {
    title: "Xác minh thanh toán?",
    confirm: "Xác nhận đã nhận tiền",
    body: "Chuyển giao dịch sang Đã thanh toán và xác nhận đơn đặt tour (dùng khi khách chuyển khoản thủ công).",
    done: "Đã xác minh thanh toán.",
  },
  refund: {
    title: "Hoàn tiền giao dịch?",
    confirm: "Xác nhận hoàn tiền",
    body: "Chuyển giao dịch sang Đã hoàn tiền.",
    done: "Đã hoàn tiền giao dịch.",
  },
  cancel: {
    title: "Huỷ giao dịch?",
    confirm: "Xác nhận huỷ giao dịch",
    body: "Giao dịch đang chờ sẽ bị huỷ.",
    done: "Đã huỷ giao dịch.",
  },
};

export function PaymentManager() {
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ p: PaymentDto; action: Action } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(`payments-${status}-${page}`, () => adminService.payments({ status: status || undefined, page }));
  const m = useMutation((action: Action, id: number) =>
    action === "verify" ? adminService.verifyPayment(id) : action === "refund" ? adminService.refundPayment(id) : adminService.cancelPayment(id),
  );

  async function confirm() {
    if (!pending) return;
    const res = await m.run(pending.action, pending.p.id);
    if (res !== undefined) {
      setNotice(ACTION_META[pending.action].done);
      setPending(null);
      void q.reload();
    }
  }

  return (
    <div>
      <PageHeader title="Thanh toán" description="Theo dõi giao dịch và xử lý thủ công khi cần." />
      <div className="mb-4 max-w-xs">
        <SelectField
          id="pay-status"
          label="Lọc theo trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PaymentStatus | "");
            setPage(0);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </SelectField>
      </div>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Không có giao dịch" />
      ) : (
        <>
          <Table caption="Danh sách giao dịch thanh toán">
            <thead>
              <tr>
                <Th>Mã GD</Th>
                <Th>Đơn</Th>
                <Th>Khách hàng</Th>
                <Th>Số tiền</Th>
                <Th>Cổng</Th>
                <Th>Trạng thái</Th>
                <Th>Thời gian</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">
                    #{p.id}
                    {p.transactionCode && <span className="block text-ink-soft">{p.transactionCode}</span>}
                  </Td>
                  <Td className="font-mono text-xs font-semibold">{p.bookingCode}</Td>
                  <Td>{p.customerName ?? "—"}</Td>
                  <Td className="font-semibold">{formatVnd(p.amount)}</Td>
                  <Td>{p.provider === "MOCK" ? "Giả lập" : "Stripe"}</Td>
                  <Td>
                    <PaymentStatusBadge status={p.status} />
                  </Td>
                  <Td className="text-xs">{formatDateTime(p.paidAt ?? p.createdAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "PENDING" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setPending({ p, action: "verify" })} aria-label={`Xác minh giao dịch ${p.id}`}>
                            <BadgeCheck className="size-4" aria-hidden="true" /> Xác minh
                          </Button>
                          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setPending({ p, action: "cancel" })} aria-label={`Huỷ giao dịch ${p.id}`}>
                            <Ban className="size-4" aria-hidden="true" /> Huỷ
                          </Button>
                        </>
                      )}
                      {p.status === "PAID" && (
                        <Button size="sm" variant="ghost" onClick={() => setPending({ p, action: "refund" })} aria-label={`Hoàn tiền giao dịch ${p.id}`}>
                          <Undo2 className="size-4" aria-hidden="true" /> Hoàn tiền
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
      <Dialog
        open={!!pending}
        onClose={() => {
          setPending(null);
          m.reset();
        }}
        title={pending ? ACTION_META[pending.action].title : ""}
        description={pending ? `Giao dịch #${pending.p.id} — ${pending.p.bookingCode} — ${formatVnd(pending.p.amount)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Quay lại
            </Button>
            <Button variant={pending?.action === "verify" ? "primary" : "danger"} onClick={confirm} loading={m.pending}>
              {pending ? ACTION_META[pending.action].confirm : ""}
            </Button>
          </>
        }
      >
        <p className="text-sm">{pending ? ACTION_META[pending.action].body : ""}</p>
        {m.error && <Alert tone="error" className="mt-3">{m.error.message}</Alert>}
      </Dialog>
    </div>
  );
}
