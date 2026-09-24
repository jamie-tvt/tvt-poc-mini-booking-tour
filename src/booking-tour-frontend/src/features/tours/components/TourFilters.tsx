"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { TOUR_SORT_OPTIONS } from "@/lib/utils/labels";
import { toQueryString } from "@/lib/utils/query";
import type { CategoryDto } from "@/types/domain";
import type { TourSearchParams } from "../types";

type FilterState = Required<Omit<TourSearchParams, "page">>;

function toState(p: TourSearchParams): FilterState {
  return {
    keyword: p.keyword ?? "",
    categoryId: p.categoryId ?? "",
    minPrice: p.minPrice ?? "",
    maxPrice: p.maxPrice ?? "",
    departFrom: p.departFrom ?? "",
    departTo: p.departTo ?? "",
    sort: p.sort ?? "",
  };
}

/** Bộ lọc tour — đồng bộ với URL search params (về trang 0 mỗi khi đổi lọc). */
export function TourFilters({ initial, categories }: { initial: TourSearchParams; categories: CategoryDto[] }) {
  const router = useRouter();
  const [f, setF] = useState<FilterState>(() => toState(initial));
  const [error, setError] = useState<string | null>(null);

  function push(next: FilterState) {
    router.push(`/tours${toQueryString({ ...next, keyword: next.keyword.trim() })}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (f.minPrice && f.maxPrice && Number(f.minPrice) > Number(f.maxPrice)) {
      setError("Giá tối thiểu không được lớn hơn giá tối đa.");
      return;
    }
    if (f.departFrom && f.departTo && f.departFrom > f.departTo) {
      setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    setError(null);
    push(f);
  }

  function set<K extends keyof FilterState>(key: K, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} aria-label="Bộ lọc tour" className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="f-keyword"
          label="Từ khoá"
          placeholder="Tên tour, điểm đến"
          value={f.keyword}
          onChange={(e) => set("keyword", e.target.value)}
        />
        <SelectField id="f-category" label="Danh mục" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField
          id="f-min"
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          label="Giá từ (₫)"
          value={f.minPrice}
          onChange={(e) => set("minPrice", e.target.value)}
        />
        <TextField
          id="f-max"
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          label="Giá đến (₫)"
          value={f.maxPrice}
          onChange={(e) => set("maxPrice", e.target.value)}
        />
        <TextField id="f-from" type="date" label="Khởi hành từ ngày" value={f.departFrom} onChange={(e) => set("departFrom", e.target.value)} />
        <TextField id="f-to" type="date" label="Khởi hành đến ngày" value={f.departTo} onChange={(e) => set("departTo", e.target.value)} />
        <SelectField
          id="f-sort"
          label="Sắp xếp"
          value={f.sort}
          onChange={(e) => {
            const next = { ...f, sort: e.target.value };
            setF(next);
            push(next);
          }}
        >
          <option value="">Mặc định</option>
          {TOUR_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            <SlidersHorizontal className="size-4" aria-hidden="true" /> Áp dụng bộ lọc
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Xoá bộ lọc"
            onClick={() => {
              setF(toState({}));
              setError(null);
              router.push("/tours");
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
