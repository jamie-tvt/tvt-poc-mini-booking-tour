"use client";

import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { TourImage } from "@/components/shared/TourImage";
import { useMutation } from "@/lib/api/hooks";
import type { TourImageDto } from "@/types/domain";
import { managerService } from "../services/managerService";

export function ImageManager({ tourId, initial }: { tourId: number; initial: TourImageDto[] }) {
  const [images, setImages] = useState(() => [...initial].sort((a, b) => a.sortOrder - b.sortOrder));
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const add = useMutation(managerService.addImage);
  const del = useMutation(managerService.deleteImage);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v || !(v.startsWith("/") || /^https?:\/\//.test(v))) {
      setUrlError("Nhập URL ảnh bắt đầu bằng http(s):// hoặc /");
      return;
    }
    setUrlError(undefined);
    const img = await add.run(tourId, v);
    if (img) {
      setImages((prev) => [...prev, img]);
      setUrl("");
    }
  }

  async function onDelete(id: number) {
    const ok = await del.run(tourId, id);
    if (ok !== undefined) setImages((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onAdd} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <TextField
          id="img-url"
          label="URL ảnh"
          placeholder="/images/tours/phu-quoc.svg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={urlError ?? add.fieldErrors.imageUrl}
          containerClassName="flex-1"
        />
        <Button type="submit" variant="secondary" loading={add.pending} className="sm:mt-7">
          <ImagePlus className="size-4" aria-hidden="true" /> Thêm ảnh
        </Button>
      </form>
      {(add.error || del.error) && <Alert tone="error">{(add.error ?? del.error)?.message}</Alert>}
      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-ink-soft">Tour chưa có ảnh bổ sung.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-line bg-white">
              <TourImage src={img.imageUrl} alt={`Ảnh ${i + 1}`} />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-xs text-ink-soft">{img.imageUrl}</span>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => onDelete(img.id)} aria-label={`Xoá ảnh ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden="true" /> Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
