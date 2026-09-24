"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { TOUR_STATUS, TOUR_STATUSES } from "@/lib/utils/labels";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { TourDetailDto } from "@/types/domain";
import { managerService, type TourPayload } from "../services/managerService";
import { tourSchema, type TourFormValues } from "../validators/managerSchemas";

function toValues(t?: TourDetailDto): Record<keyof TourFormValues, string> {
  return {
    tourCode: t?.tourCode ?? "",
    title: t?.title ?? "",
    description: t?.description ?? "",
    destination: t?.destination ?? "",
    durationDays: t ? String(t.durationDays) : "2",
    maxGuests: t ? String(t.maxGuests) : "20",
    price: t ? String(t.price) : "",
    categoryId: t ? String(t.categoryId) : "",
    coverImageUrl: t?.coverImageUrl ?? "",
    status: t?.status ?? "DRAFT",
  };
}

export function TourForm({ tour, onSaved }: { tour?: TourDetailDto; onSaved?: (t: TourDetailDto) => void }) {
  const router = useRouter();
  const cats = useApiQuery("categories", managerService.categories);
  const [v, setV] = useState(() => toValues(tour));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const m = useMutation((p: TourPayload) => (tour ? managerService.updateTour(tour.id, p) : managerService.createTour(p)));

  const set = (k: keyof TourFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const parsed = tourSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const res = await m.run(parsed.data);
    if (!res) return;
    if (tour) {
      setSaved(true);
      onSaved?.(res);
    } else {
      router.push(`/manager/tours/${res.id}`);
    }
  }

  const fe = { ...m.fieldErrors, ...errors };
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="t-code" label="Mã tour" value={v.tourCode} onChange={set("tourCode")} error={fe.tourCode} required placeholder="VD: CT-CAIRANG-2N1D" />
        <TextField id="t-title" label="Tên tour" value={v.title} onChange={set("title")} error={fe.title} required />
        <TextField id="t-dest" label="Điểm đến" value={v.destination} onChange={set("destination")} error={fe.destination} required />
        <SelectField id="t-cat" label="Danh mục" value={v.categoryId} onChange={set("categoryId")} error={fe.categoryId ?? (cats.error ? cats.error.message : undefined)} required>
          <option value="">-- Chọn danh mục --</option>
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField id="t-days" label="Số ngày" type="number" min={1} value={v.durationDays} onChange={set("durationDays")} error={fe.durationDays} required />
        <TextField id="t-max" label="Số khách tối đa / đợt" type="number" min={1} value={v.maxGuests} onChange={set("maxGuests")} error={fe.maxGuests} required />
        <TextField id="t-price" label="Giá người lớn (₫)" type="number" min={0} step={1000} value={v.price} onChange={set("price")} error={fe.price} required />
        <SelectField id="t-status" label="Trạng thái" value={v.status} onChange={set("status")} error={fe.status} required>
          {TOUR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TOUR_STATUS[s].label}
            </option>
          ))}
        </SelectField>
        <TextField
          id="t-cover"
          label="URL ảnh bìa"
          value={v.coverImageUrl}
          onChange={set("coverImageUrl")}
          error={fe.coverImageUrl}
          hint="VD: /images/tours/cai-rang.svg"
          containerClassName="md:col-span-2"
        />
        <TextAreaField id="t-desc" label="Mô tả" rows={6} value={v.description} onChange={set("description")} error={fe.description} required containerClassName="md:col-span-2" />
      </div>
      {saved && <Alert tone="success">Đã lưu thông tin tour.</Alert>}
      {m.error && !m.error.errors.length && <Alert tone="error">{m.error.message}</Alert>}
      <Button type="submit" loading={m.pending} className="self-start">
        <Save className="size-4" aria-hidden="true" /> {tour ? "Lưu thông tin tour" : "Tạo tour"}
      </Button>
    </form>
  );
}
