"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Luggage } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LinkButton } from "@/components/ui/Button";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useApiQuery } from "@/lib/api/hooks";
import { BOOKING_STATUS, BOOKING_STATUSES } from "@/lib/utils/labels";
import type { BookingStatus } from "@/types/domain";
import { bookingService } from "../services/bookingService";
import { BookingCard } from "./BookingCard";

type TabKey = "ALL" | BookingStatus;

export function MyBookings({ initialStatus }: { initialStatus?: string }) {
  const router = useRouter();
  const valid = BOOKING_STATUSES.includes(initialStatus as BookingStatus) ? (initialStatus as BookingStatus) : "ALL";
  const [tab, setTab] = useState<TabKey>(valid);
  const [page, setPage] = useState(0);
  const status = tab === "ALL" ? undefined : tab;
  const q = useApiQuery(`my-bookings-${tab}-${page}`, () => bookingService.mine(status, page));

  const tabs = [{ key: "ALL" as TabKey, label: "Tất cả" }, ...BOOKING_STATUSES.map((s) => ({ key: s as TabKey, label: BOOKING_STATUS[s].label }))];

  return (
    <div>
      <Tabs
        idPrefix="my-bookings"
        label="Lọc đơn theo trạng thái"
        items={tabs}
        value={tab}
        onChange={(k) => {
          setTab(k);
          setPage(0);
          router.replace(k === "ALL" ? "/bookings" : `/bookings?status=${k}`, { scroll: false });
        }}
      />
      <TabPanel idPrefix="my-bookings" activeKey={tab}>
        {q.loading ? (
          <Spinner />
        ) : q.error ? (
          <ErrorState message={q.error.message} />
        ) : !q.data || q.data.content.length === 0 ? (
          <EmptyState
            icon={Luggage}
            title="Chưa có đơn nào"
            description={tab === "ALL" ? "Bạn chưa đặt tour nào. Khám phá các tour đang mở bán nhé!" : "Không có đơn ở trạng thái này."}
            action={<LinkButton href="/tours">Khám phá tour</LinkButton>}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {q.data.content.map((b) => (
                <li key={b.id}>
                  <BookingCard booking={b} />
                </li>
              ))}
            </ul>
            <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
          </>
        )}
      </TabPanel>
    </div>
  );
}
