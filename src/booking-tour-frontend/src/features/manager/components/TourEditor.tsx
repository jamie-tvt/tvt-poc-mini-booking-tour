"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/shared/ErrorState";
import { useApiQuery } from "@/lib/api/hooks";
import { TOUR_STATUS } from "@/lib/utils/labels";
import { managerService } from "../services/managerService";
import { DepartureManager } from "./DepartureManager";
import { ImageManager } from "./ImageManager";
import { ItineraryEditor } from "./ItineraryEditor";
import { TourForm } from "./TourForm";

type TabKey = "info" | "itinerary" | "images" | "departures";
const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Thông tin" },
  { key: "itinerary", label: "Lịch trình" },
  { key: "images", label: "Ảnh" },
  { key: "departures", label: "Đợt khởi hành" },
];

export function TourEditor({ id, initialTab }: { id: string; initialTab?: string }) {
  const q = useApiQuery(`mgr-tour-${id}`, () => managerService.tour(id));
  const [tab, setTab] = useState<TabKey>(TABS.some((t) => t.key === initialTab) ? (initialTab as TabKey) : "info");

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const tour = q.data;

  return (
    <div>
      <Link href="/manager" className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Danh sách tour
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{tour.title}</h1>
        <Badge tone={TOUR_STATUS[tour.status].tone}>{TOUR_STATUS[tour.status].label}</Badge>
        {tour.status === "ACTIVE" && (
          <Link href={`/tours/${tour.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline" target="_blank">
            Xem trang công khai <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <Card>
        <Tabs idPrefix="tour-edit" label="Nội dung tour" items={TABS} value={tab} onChange={setTab} />
        <TabPanel idPrefix="tour-edit" activeKey={tab}>
          {tab === "info" && <TourForm tour={tour} onSaved={(t) => q.setData(t)} />}
          {tab === "itinerary" && <ItineraryEditor tourId={tour.id} initial={tour.itinerary ?? []} />}
          {tab === "images" && <ImageManager tourId={tour.id} initial={tour.images ?? []} />}
          {tab === "departures" && <DepartureManager tourId={tour.id} tourPrice={tour.price} />}
        </TabPanel>
      </Card>
    </div>
  );
}
