"use client";

import Link from "next/link";
import { Banknote, CalendarClock, Map as MapIcon, RotateCcw, Ticket, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatusBadge } from "@/features/bookings/components/BookingStatusBadge";
import { useApiQuery } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDate, formatDateTime, formatNumber, formatVnd } from "@/lib/utils/format";
import { BOOKING_STATUS, BOOKING_STATUSES } from "@/lib/utils/labels";
import { adminService } from "../services/adminService";
import { DemoTools } from "./DemoTools";

function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-soft text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="font-heading text-2xl font-bold text-ink">{value}</p>
        {sub && <p className="text-xs text-ink-soft">{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const q = useApiQuery("dashboard", adminService.dashboard);
  const bookingsBase = user?.role === "ADMIN" ? "/admin/bookings" : "/manager/bookings";

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Tổng quan" description="Số liệu vận hành theo thời gian thực." />
      {user?.role === "ADMIN" && (
        <div className="mb-6">
          <DemoTools />
        </div>
      )}
      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error || !q.data ? (
        <ErrorState message={q.error?.message} />
      ) : (
        <>
          <section aria-label="Chỉ số chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat icon={MapIcon} label="Tour" value={formatNumber(q.data.tours.total)} sub={`${q.data.tours.active} đang hoạt động`} />
            <Stat
              icon={CalendarClock}
              label="Đợt sắp khởi hành"
              value={formatNumber(q.data.departures.upcoming)}
              sub={`${q.data.departures.inProgress} đợt đang diễn ra`}
            />
            <Stat icon={Users} label="Người dùng" value={formatNumber(q.data.users.total)} sub={`${q.data.users.customers} khách hàng`} />
            <Stat icon={Banknote} label="Doanh thu đã thu" value={formatVnd(q.data.revenue.paid)} />
            <Stat icon={RotateCcw} label="Đã hoàn tiền" value={formatVnd(q.data.revenue.refunded)} />
            <Stat
              icon={Ticket}
              label="Tổng đơn"
              value={formatNumber(BOOKING_STATUSES.reduce((s, k) => s + (q.data!.bookings[k] ?? 0), 0))}
            />
          </section>

          <section aria-labelledby="bk-status" className="mt-6">
            <h2 id="bk-status" className="mb-3 text-lg font-bold">
              Đơn theo trạng thái
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {BOOKING_STATUSES.map((s) => (
                <li key={s} className="rounded-xl border border-line bg-white p-4">
                  <BookingStatusBadge status={s} />
                  <p className="mt-2 font-heading text-2xl font-bold" aria-label={`${BOOKING_STATUS[s].label}: ${q.data!.bookings[s] ?? 0} đơn`}>
                    {formatNumber(q.data!.bookings[s] ?? 0)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent" className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="recent" className="text-lg font-bold">
                Đơn gần đây
              </h2>
              <Link href={bookingsBase} className="text-sm font-semibold text-brand hover:underline">
                Xem tất cả đơn
              </Link>
            </div>
            {q.data.recentBookings.length === 0 ? (
              <p className="text-ink-soft">Chưa có đơn nào.</p>
            ) : (
              <Table caption="Đơn đặt tour gần đây">
                <thead>
                  <tr>
                    <Th>Mã đơn</Th>
                    <Th>Khách hàng</Th>
                    <Th>Tour</Th>
                    <Th>Ngày đi</Th>
                    <Th>Tổng tiền</Th>
                    <Th>Trạng thái</Th>
                    <Th>Đặt lúc</Th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.recentBookings.map((b) => (
                    <tr key={b.id}>
                      <Td className="font-mono text-xs font-semibold">
                        <Link href={`${bookingsBase}/${b.id}`} className="hover:text-brand hover:underline">
                          {b.bookingCode}
                        </Link>
                      </Td>
                      <Td>{b.customer?.fullName}</Td>
                      <Td>{b.tourTitle}</Td>
                      <Td>{formatDate(b.departure?.startAt)}</Td>
                      <Td>{formatVnd(b.totalPrice)}</Td>
                      <Td>
                        <BookingStatusBadge status={b.status} />
                      </Td>
                      <Td className="text-xs">{formatDateTime(b.bookedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
