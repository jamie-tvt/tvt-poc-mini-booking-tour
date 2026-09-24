"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Search } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatusBadge } from "@/features/bookings/components/BookingStatusBadge";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDate, formatDateTime, formatVnd } from "@/lib/utils/format";
import { BOOKING_STATUS, BOOKING_STATUSES } from "@/lib/utils/labels";
import type { BookingStatus } from "@/types/domain";
import { managerService } from "../services/managerService";

/** Danh sách đơn cho Staff (GET /admin/bookings) — dùng ở /manager/bookings và /admin/bookings. */
export function StaffBookingList({ basePath }: { basePath: string }) {
  const [kwInput, setKwInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [page, setPage] = useState(0);
  const q = useApiQuery(`staff-bookings-${keyword}-${status}-${page}`, () =>
    managerService.bookings({ keyword: keyword || undefined, status: status || undefined, page }),
  );

  return (
    <div>
      <PageHeader title="Đơn đặt tour" description="Tra cứu và theo dõi mọi đơn đặt tour." />
      <form
        className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setKeyword(kwInput.trim());
          setPage(0);
        }}
      >
        <TextField id="sb-keyword" label="Tìm đơn" placeholder="Mã đơn, tên hoặc email khách" value={kwInput} onChange={(e) => setKwInput(e.target.value)} />
        <SelectField
          id="sb-status"
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BookingStatus | "");
            setPage(0);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS[s].label}
            </option>
          ))}
        </SelectField>
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" /> Tìm kiếm
        </Button>
      </form>
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Không có đơn phù hợp" />
      ) : (
        <>
          <Table caption="Danh sách đơn đặt tour">
            <thead>
              <tr>
                <Th>Mã đơn</Th>
                <Th>Khách hàng</Th>
                <Th>Tour / đợt</Th>
                <Th>Số vé</Th>
                <Th>Tổng tiền</Th>
                <Th>Trạng thái</Th>
                <Th>Đặt lúc</Th>
                <Th className="text-right">
                  <span className="sr-only">Thao tác</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((b) => (
                <tr key={b.id}>
                  <Td className="font-mono text-xs font-semibold">
                    <Link href={`${basePath}/${b.id}`} className="hover:text-brand hover:underline">
                      {b.bookingCode}
                    </Link>
                  </Td>
                  <Td>
                    {b.customer?.fullName}
                    <span className="block text-xs text-ink-soft">{b.customer?.email}</span>
                  </Td>
                  <Td>
                    {b.tourTitle}
                    <span className="block text-xs text-ink-soft">Đi {formatDate(b.departure?.startAt)}</span>
                  </Td>
                  <Td>{b.ticketQuantity ?? b.adultQuantity + b.childQuantity}</Td>
                  <Td>{formatVnd(b.totalPrice)}</Td>
                  <Td>
                    <BookingStatusBadge status={b.status} />
                  </Td>
                  <Td className="text-xs">{formatDateTime(b.bookedAt)}</Td>
                  <Td className="text-right">
                    <LinkButton href={`${basePath}/${b.id}`} size="sm" variant="ghost" aria-label={`Xem chi tiết đơn ${b.bookingCode}`}>
                      <Eye className="size-4" aria-hidden="true" /> Xem
                    </LinkButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
