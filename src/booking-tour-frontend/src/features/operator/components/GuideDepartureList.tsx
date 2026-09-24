"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateRange, formatTime } from "@/lib/utils/format";
import { DEPARTURE_STATUS } from "@/lib/utils/labels";
import { asList } from "@/lib/utils/query";
import type { DepartureStatus } from "@/types/domain";
import { operatorService } from "../services/operatorService";

const TABS: { key: DepartureStatus; label: string }[] = [
  { key: "OPEN", label: "Sắp diễn ra" },
  { key: "IN_PROGRESS", label: "Đang diễn ra" },
  { key: "COMPLETED", label: "Đã hoàn thành" },
];

export function GuideDepartureList() {
  const [tab, setTab] = useState<DepartureStatus>("OPEN");
  const q = useApiQuery(`guide-deps-${tab}`, () => operatorService.departures(tab));
  const list = asList(q.data).sort((a, b) => (tab === "COMPLETED" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));

  return (
    <div>
      <PageHeader title="Đợt được phân công" description="Lịch dẫn tour của bạn." />
      <Tabs idPrefix="guide" label="Lọc theo trạng thái đợt" items={TABS} value={tab} onChange={setTab} />
      <TabPanel idPrefix="guide" activeKey={tab}>
        {q.loading ? (
          <Spinner />
        ) : q.error ? (
          <ErrorState message={q.error.message} />
        ) : list.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Không có đợt nào" description="Chưa có đợt khởi hành ở trạng thái này." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/operator/tours/${d.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-pop"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{d.tourTitle}</p>
                      <Badge tone={DEPARTURE_STATUS[d.status].tone}>{DEPARTURE_STATUS[d.status].label}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                      <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                      {formatDateRange(d.startAt, d.endAt)} · {formatTime(d.startAt)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-ink-soft">
                      <Users className="size-4 text-brand" aria-hidden="true" /> {d.bookedSeats}/{d.capacity} khách
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-ink-soft" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </TabPanel>
    </div>
  );
}
