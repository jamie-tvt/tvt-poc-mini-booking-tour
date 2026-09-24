"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, MapPin, Plus, Save, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import type { ItineraryItemDto } from "@/types/domain";
import { managerService } from "../services/managerService";

type Row = { placeId: number; placeName: string };

export function ItineraryEditor({ tourId, initial }: { tourId: number; initial: ItineraryItemDto[] }) {
  const places = useApiQuery("places", managerService.places);
  const [rows, setRows] = useState<Row[]>(() =>
    [...initial].sort((a, b) => a.displayOrder - b.displayOrder).map((i) => ({ placeId: i.placeId, placeName: i.placeName })),
  );
  const [pick, setPick] = useState("");
  const [saved, setSaved] = useState(false);
  const m = useMutation(managerService.saveItinerary);

  function move(i: number, delta: number) {
    setSaved(false);
    setRows((prev) => {
      const next = [...prev];
      const j = i + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  function add() {
    const place = places.data?.find((p) => String(p.id) === pick);
    if (!place) return;
    setRows((prev) => [...prev, { placeId: place.id, placeName: place.name }]);
    setPick("");
    setSaved(false);
  }

  async function save() {
    const res = await m.run(tourId, rows.map((r) => r.placeId));
    if (res !== undefined) setSaved(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SelectField id="iti-place" label="Chọn địa điểm" value={pick} onChange={(e) => setPick(e.target.value)} containerClassName="flex-1">
          <option value="">-- Chọn địa điểm --</option>
          {(places.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <Button variant="secondary" onClick={add} disabled={!pick}>
          <Plus className="size-4" aria-hidden="true" /> Thêm địa điểm
        </Button>
      </div>
      {places.error && <Alert tone="error">{places.error.message}</Alert>}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-ink-soft">Chưa có điểm dừng nào trong lịch trình.</p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="Thứ tự lịch trình">
          {rows.map((r, i) => (
            <li key={`${r.placeId}-${i}`} className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
              <MapPin className="size-4 shrink-0 text-cta" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{r.placeName}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Đưa ${r.placeName} lên`}>
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Đưa ${r.placeName} xuống`}>
                  <ArrowDown className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => {
                    setRows((prev) => prev.filter((_, k) => k !== i));
                    setSaved(false);
                  }}
                  aria-label={`Bỏ ${r.placeName} khỏi lịch trình`}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {saved && <Alert tone="success">Đã lưu lịch trình.</Alert>}
      {m.error && <Alert tone="error">{m.error.message}</Alert>}
      <Button onClick={save} loading={m.pending} className="self-start">
        <Save className="size-4" aria-hidden="true" /> Lưu lịch trình
      </Button>
    </div>
  );
}
