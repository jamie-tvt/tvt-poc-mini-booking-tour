"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField, inputClasses } from "@/components/ui/Field";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatVnd } from "@/lib/utils/format";
import { TOUR_SORT_OPTIONS } from "@/lib/utils/labels";
import { toQueryString } from "@/lib/utils/query";
import type { PageResponse } from "@/types/api";
import type { CategoryDto, TourSummaryDto } from "@/types/domain";
import type { TourSearchParams } from "../types";

type FilterState = Required<Omit<TourSearchParams, "page">>;
type FilterKey = keyof FilterState;
type FilterError = { field: "price" | "date"; message: string };

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

function validate(f: FilterState): FilterError | null {
  if (f.minPrice && f.maxPrice && Number(f.minPrice) > Number(f.maxPrice)) {
    return { field: "price", message: "Giá tối thiểu không được lớn hơn giá tối đa." };
  }
  if (f.departFrom && f.departTo && f.departFrom > f.departTo) {
    return { field: "date", message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." };
  }
  return null;
}

/** "2026-10-01" → "01/10/2026" (không đổi múi giờ). */
const ymdToVn = (v: string) => v.split("-").reverse().join("/");

/** Các điều kiện đang bật (không tính sắp xếp) → chip có nút ✕ trên mobile. */
function activeChips(f: FilterState, categories: CategoryDto[]): { key: FilterKey; label: string }[] {
  const chips: { key: FilterKey; label: string }[] = [];
  if (f.keyword) chips.push({ key: "keyword", label: `“${f.keyword}”` });
  if (f.categoryId) chips.push({ key: "categoryId", label: categories.find((c) => String(c.id) === f.categoryId)?.name ?? "Danh mục" });
  if (f.minPrice) chips.push({ key: "minPrice", label: `≥ ${formatVnd(Number(f.minPrice))}` });
  if (f.maxPrice) chips.push({ key: "maxPrice", label: `≤ ${formatVnd(Number(f.maxPrice))}` });
  if (f.departFrom) chips.push({ key: "departFrom", label: `Từ ${ymdToVn(f.departFrom)}` });
  if (f.departTo) chips.push({ key: "departTo", label: `Đến ${ymdToVn(f.departTo)}` });
  return chips;
}

/**
 * Bộ lọc tour — đồng bộ với URL search params (về trang 0 mỗi khi đổi lọc).
 * Desktop (≥ lg): lưới 4 cột như cũ. Mobile: ô từ khoá + "Bộ lọc (n)" + "Sắp xếp" + chip điều kiện; bấm "Bộ lọc" mở bottom sheet.
 */
export function TourFilters({ initial, categories }: { initial: TourSearchParams; categories: CategoryDto[] }) {
  const router = useRouter();
  const applied = toState(initial);
  const [f, setF] = useState<FilterState>(() => toState(initial));
  const [error, setError] = useState<string | null>(null);

  function push(next: FilterState) {
    router.push(`/tours${toQueryString({ ...next, keyword: next.keyword.trim() })}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(f);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    push(f);
  }

  function set<K extends keyof FilterState>(key: K, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <MobileFilters applied={applied} categories={categories} push={push} />

      <form onSubmit={onSubmit} aria-label="Bộ lọc tour" className="glass hidden p-4 lg:block">
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
    </>
  );
}

const chipBase =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-200";

function MobileFilters({
  applied,
  categories,
  push,
}: {
  applied: FilterState;
  categories: CategoryDto[];
  push: (next: FilterState) => void;
}) {
  const [keyword, setKeyword] = useState(applied.keyword);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(applied);
  const [error, setError] = useState<FilterError | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const chips = activeChips(applied, categories);

  // Đếm trước số tour khớp bộ lọc đang chọn trong sheet → nút "Xem N tour"
  useEffect(() => {
    if (!open || validate(draft)) {
      setCount(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      api
        .get<PageResponse<TourSummaryDto>>("/tours", { ...draft, keyword: draft.keyword.trim(), sort: undefined, page: 0, size: 1 }, { auth: false })
        .then((res) => alive && setCount(res.totalElements))
        .catch(() => alive && setCount(null));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, draft]);

  function openSheet() {
    setDraft({ ...applied, keyword: keyword.trim() });
    setError(null);
    setOpen(true);
  }

  function setD<K extends FilterKey>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    const err = validate(draft);
    setError(err);
    if (err) return;
    setOpen(false);
    push(draft);
  }

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          push({ ...applied, keyword });
        }}
        className="relative"
      >
        <label htmlFor="fm-keyword" className="sr-only">
          Tìm theo tên tour, điểm đến
        </label>
        <input
          id="fm-keyword"
          type="search"
          enterKeyHint="search"
          placeholder="Tìm theo tên tour, điểm đến"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={cn(inputClasses, "bg-white/90 pr-12")}
        />
        <button
          type="submit"
          aria-label="Tìm"
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-brand transition-colors duration-200 hover:bg-sky-soft"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </form>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={openSheet}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            chipBase,
            chips.length > 0 ? "border-brand bg-brand text-white hover:bg-brand-hover" : "border-line-strong bg-white text-ink hover:bg-sky-soft",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Bộ lọc{chips.length > 0 && ` (${chips.length})`}
        </button>
        <div className="relative min-w-0 flex-1">
          <label htmlFor="fm-sort" className="sr-only">
            Sắp xếp
          </label>
          <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" aria-hidden="true" />
          <select
            id="fm-sort"
            value={applied.sort}
            onChange={(e) => push({ ...applied, sort: e.target.value })}
            className={cn(chipBase, "w-full appearance-none border-line-strong bg-white pl-9 pr-4 text-ink hover:bg-sky-soft")}
          >
            <option value="">Sắp xếp: Mặc định</option>
            {TOUR_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Điều kiện lọc đang bật">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => push({ ...applied, [c.key]: "" })}
                aria-label={`Bỏ lọc ${c.label}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-white/90 py-1 pl-3 pr-2 text-sm font-medium text-ink transition-colors duration-200 hover:border-brand hover:bg-sky-soft"
              >
                {c.label}
                <X className="size-4 text-ink-soft" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Bộ lọc"
        closeLabel="Đóng bộ lọc"
        headerAction={
          <button
            type="button"
            onClick={() => {
              setDraft((d) => ({ ...toState({}), keyword: d.keyword, sort: d.sort }));
              setError(null);
            }}
            className="min-h-11 rounded-lg px-2 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-sky-soft"
          >
            Xoá tất cả
          </button>
        }
        footer={
          <Button variant="cta" size="lg" className="w-full" onClick={apply}>
            {count !== null ? `Xem ${formatNumber(count)} tour` : "Xem kết quả"}
          </Button>
        }
      >
        <form
          id="tour-filter-sheet"
          aria-label="Bộ lọc tour"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="flex flex-col gap-5"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Danh mục</legend>
            <div className="flex flex-wrap gap-2">
              {[{ id: "", name: "Tất cả" }, ...categories].map((c) => {
                const on = draft.categoryId === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setD("categoryId", String(c.id))}
                    className={cn(
                      chipBase,
                      "font-medium",
                      on ? "border-brand bg-brand text-white" : "border-line-strong bg-white text-ink hover:bg-sky-soft",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Khoảng giá (₫)</legend>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="fs-min"
                type="number"
                inputMode="numeric"
                min={0}
                step={50000}
                label="Giá từ (₫)"
                srOnlyLabel
                placeholder="Từ"
                value={draft.minPrice}
                aria-invalid={error?.field === "price" || undefined}
                onChange={(e) => setD("minPrice", e.target.value)}
              />
              <TextField
                id="fs-max"
                type="number"
                inputMode="numeric"
                min={0}
                step={50000}
                label="Giá đến (₫)"
                srOnlyLabel
                placeholder="Đến"
                value={draft.maxPrice}
                aria-invalid={error?.field === "price" || undefined}
                onChange={(e) => setD("maxPrice", e.target.value)}
              />
            </div>
            {error?.field === "price" && (
              <p role="alert" className="mt-1.5 text-sm text-danger">
                {error.message}
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Ngày khởi hành</legend>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="fs-from"
                type="date"
                label="Khởi hành từ ngày"
                value={draft.departFrom}
                aria-invalid={error?.field === "date" || undefined}
                onChange={(e) => setD("departFrom", e.target.value)}
              />
              <TextField
                id="fs-to"
                type="date"
                label="Khởi hành đến ngày"
                value={draft.departTo}
                aria-invalid={error?.field === "date" || undefined}
                onChange={(e) => setD("departTo", e.target.value)}
              />
            </div>
            {error?.field === "date" && (
              <p role="alert" className="mt-1.5 text-sm text-danger">
                {error.message}
              </p>
            )}
          </fieldset>
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </BottomSheet>
    </div>
  );
}
