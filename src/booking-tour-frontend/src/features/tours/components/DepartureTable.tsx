import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { formatDateRange, formatTime, formatVnd } from "@/lib/utils/format";
import type { DepartureDto } from "@/types/domain";

/** Bảng đợt khởi hành công khai. Link sang trang đặt — chưa đăng nhập thì guard chuyển qua /login?next=. */
export function DepartureTable({ tourId, departures }: { tourId: number; departures: DepartureDto[] }) {
  if (departures.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong bg-white p-4 text-ink-soft">
        Hiện chưa có đợt khởi hành đang mở bán. Vui lòng quay lại sau.
      </p>
    );
  }
  const sorted = [...departures].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (
    <>
      {/* Desktop: bảng */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Các đợt khởi hành đang mở bán</caption>
          <thead>
            <tr className="bg-sky-soft">
              <th scope="col" className="px-3 py-2.5 font-semibold">Ngày đi – về</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Người lớn</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Trẻ em</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Chỗ trống</th>
              <th scope="col" className="px-3 py-2.5"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <DepartureRow key={d.id} tourId={tourId} d={d} />
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: thẻ */}
      <ul className="flex flex-col gap-3 md:hidden">
        {sorted.map((d) => {
          const full = d.availableSeats <= 0;
          return (
            <li key={d.id} className="rounded-xl border border-line bg-white p-4">
              <p className="font-semibold">{formatDateRange(d.startAt, d.endAt)}</p>
              <p className="text-sm text-ink-soft">Khởi hành lúc {formatTime(d.startAt)}</p>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <dt className="text-ink-soft">Người lớn</dt>
                <dd className="text-right font-semibold">{formatVnd(d.adultPrice)}</dd>
                <dt className="text-ink-soft">Trẻ em</dt>
                <dd className="text-right font-semibold">{formatVnd(d.childPrice)}</dd>
                <dt className="text-ink-soft">Chỗ trống</dt>
                <dd className="text-right">
                  Còn {d.availableSeats}/{d.capacity} chỗ
                </dd>
              </dl>
              <SelectLink tourId={tourId} d={d} full={full} className="mt-3 w-full" />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DepartureRow({ tourId, d }: { tourId: number; d: DepartureDto }) {
  const full = d.availableSeats <= 0;
  return (
    <tr className="border-t border-line">
      <td className="px-3 py-3">
        <span className="font-semibold">{formatDateRange(d.startAt, d.endAt)}</span>
        <span className="block text-xs text-ink-soft">Khởi hành lúc {formatTime(d.startAt)}</span>
      </td>
      <td className="px-3 py-3 font-semibold">{formatVnd(d.adultPrice)}</td>
      <td className="px-3 py-3">{formatVnd(d.childPrice)}</td>
      <td className="px-3 py-3">
        Còn {d.availableSeats}/{d.capacity} chỗ
      </td>
      <td className="px-3 py-3 text-right">
        <SelectLink tourId={tourId} d={d} full={full} />
      </td>
    </tr>
  );
}

function SelectLink({ tourId, d, full, className }: { tourId: number; d: DepartureDto; full: boolean; className?: string }) {
  if (full) {
    return (
      <span className={buttonClasses("secondary", "sm", `${className ?? ""} pointer-events-none opacity-60`)} aria-disabled="true">
        Hết chỗ
      </span>
    );
  }
  return (
    <Link
      href={`/tours/${tourId}/booking?departureId=${d.id}`}
      className={buttonClasses("cta", "sm", className)}
      aria-label={`Chọn đợt này — khởi hành ${formatDateRange(d.startAt, d.endAt)}`}
    >
      Chọn đợt này
    </Link>
  );
}
