"use client";

import { useState } from "react";
import { Ban, CalendarPlus, Pencil } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorState } from "@/components/shared/ErrorState";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime, formatVnd, fromVnDateTimeInput, toVnDateTimeInput } from "@/lib/utils/format";
import { DEPARTURE_STATUS } from "@/lib/utils/labels";
import { asList } from "@/lib/utils/query";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { DepartureDto, UserDto } from "@/types/domain";
import { managerService, type DeparturePayload } from "../services/managerService";
import { departureSchema, type DepartureFormValues } from "../validators/managerSchemas";

export function DepartureManager({ tourId, tourPrice }: { tourId: number; tourPrice: number }) {
  const q = useApiQuery(`deps-${tourId}`, () => managerService.departures(tourId));
  const guides = useApiQuery("guides", managerService.guides);
  const [editing, setEditing] = useState<DepartureDto | "new" | null>(null);
  const [cancelling, setCancelling] = useState<DepartureDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = asList(q.data).sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">Giá bỏ trống sẽ lấy giá tour ({formatVnd(tourPrice)}); trẻ em mặc định 70%.</p>
        <Button onClick={() => setEditing("new")}>
          <CalendarPlus className="size-4" aria-hidden="true" /> Tạo đợt khởi hành
        </Button>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-ink-soft">Tour chưa có đợt khởi hành.</p>
      ) : (
        <Table caption="Các đợt khởi hành của tour">
          <thead>
            <tr>
              <Th>Đi</Th>
              <Th>Về</Th>
              <Th>Chỗ đã đặt</Th>
              <Th>Giá NL / TE</Th>
              <Th>Hướng dẫn viên</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <Td>{formatDateTime(d.startAt)}</Td>
                <Td>{formatDateTime(d.endAt)}</Td>
                <Td>
                  {d.bookedSeats}/{d.capacity}
                </Td>
                <Td>
                  {formatVnd(d.adultPrice)}
                  <span className="block text-xs text-ink-soft">{formatVnd(d.childPrice)}</span>
                </Td>
                <Td>{d.tourGuideName ?? <span className="text-ink-soft">Chưa phân công</span>}</Td>
                <Td>
                  <Badge tone={DEPARTURE_STATUS[d.status].tone}>{DEPARTURE_STATUS[d.status].label}</Badge>
                </Td>
                <Td className="text-right">
                  {d.status === "OPEN" && (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(d)} aria-label={`Sửa đợt ${formatDateTime(d.startAt)}`}>
                        <Pencil className="size-4" aria-hidden="true" /> Sửa
                      </Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setCancelling(d)} aria-label={`Huỷ đợt ${formatDateTime(d.startAt)}`}>
                        <Ban className="size-4" aria-hidden="true" /> Huỷ đợt
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && (
        <DepartureFormDialog
          tourId={tourId}
          departure={editing === "new" ? undefined : editing}
          guides={asList(guides.data)}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setNotice(msg);
            void q.reload();
          }}
        />
      )}
      {cancelling && (
        <CancelDepartureDialog
          departure={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            setNotice("Đã huỷ đợt khởi hành. Các đơn liên quan đã được huỷ/hoàn tiền và khách đã được thông báo.");
            void q.reload();
          }}
        />
      )}
    </div>
  );
}

function DepartureFormDialog({
  tourId,
  departure,
  guides,
  onClose,
  onSaved,
}: {
  tourId: number;
  departure?: DepartureDto;
  guides: UserDto[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [v, setV] = useState<Record<keyof DepartureFormValues, string>>({
    startAt: toVnDateTimeInput(departure?.startAt),
    endAt: toVnDateTimeInput(departure?.endAt),
    capacity: departure ? String(departure.capacity) : "20",
    adultPrice: departure ? String(departure.adultPrice) : "",
    childPrice: departure ? String(departure.childPrice) : "",
    tourGuideId: departure?.tourGuideId ? String(departure.tourGuideId) : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation((p: DeparturePayload) =>
    departure ? managerService.updateDeparture(departure.id, p) : managerService.createDeparture(tourId, p),
  );
  const hasBookings = (departure?.bookedSeats ?? 0) > 0;

  const set = (k: keyof DepartureFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  async function submit() {
    const parsed = departureSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const d = parsed.data;
    const res = await m.run({
      ...d,
      startAt: fromVnDateTimeInput(d.startAt),
      endAt: fromVnDateTimeInput(d.endAt),
    });
    if (res) onSaved(departure ? "Đã cập nhật đợt khởi hành." : "Đã tạo đợt khởi hành mới.");
  }

  const fe = { ...m.fieldErrors, ...errors };
  return (
    <Dialog
      open
      onClose={onClose}
      title={departure ? "Sửa đợt khởi hành" : "Tạo đợt khởi hành"}
      description="Giờ nhập theo múi giờ Việt Nam (GMT+7)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} loading={m.pending}>
            {departure ? "Lưu đợt khởi hành" : "Tạo đợt"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <TextField
          id="dep-start"
          label="Ngày giờ đi"
          type="datetime-local"
          value={v.startAt}
          onChange={set("startAt")}
          error={fe.startAt}
          disabled={hasBookings}
          hint={hasBookings ? "Đã có khách đặt nên không đổi ngày đi." : undefined}
          required
        />
        <TextField id="dep-end" label="Ngày giờ về" type="datetime-local" value={v.endAt} onChange={set("endAt")} error={fe.endAt} required />
        <TextField
          id="dep-cap"
          label="Sức chứa"
          type="number"
          min={Math.max(1, departure?.bookedSeats ?? 1)}
          value={v.capacity}
          onChange={set("capacity")}
          error={fe.capacity}
          hint={hasBookings ? `Không nhỏ hơn ${departure?.bookedSeats} chỗ đã đặt.` : undefined}
          required
        />
        <SelectField id="dep-guide" label="Hướng dẫn viên" value={v.tourGuideId} onChange={set("tourGuideId")} error={fe.tourGuideId}>
          <option value="">-- Chưa phân công --</option>
          {guides.map((g) => (
            <option key={g.id} value={g.id}>
              {g.fullName}
            </option>
          ))}
        </SelectField>
        <TextField id="dep-adult" label="Giá người lớn (₫)" type="number" min={0} value={v.adultPrice} onChange={set("adultPrice")} error={fe.adultPrice} hint="Bỏ trống = giá tour" />
        <TextField id="dep-child" label="Giá trẻ em (₫)" type="number" min={0} value={v.childPrice} onChange={set("childPrice")} error={fe.childPrice} hint="Bỏ trống = 70% giá tour" />
        {m.error && !m.error.errors.length && (
          <Alert tone="error" className="sm:col-span-2">
            {m.error.message}
          </Alert>
        )}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}

function CancelDepartureDialog({ departure, onClose, onDone }: { departure: DepartureDto; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const m = useMutation(managerService.cancelDeparture);

  async function confirm() {
    if (reason.trim().length < 5) {
      setErr("Vui lòng nhập lý do (tối thiểu 5 ký tự).");
      return;
    }
    setErr(undefined);
    const res = await m.run(departure.id, reason.trim());
    if (res !== undefined) onDone();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Huỷ đợt khởi hành?"
      description={`Đợt ${formatDateTime(departure.startAt)} — ${departure.bookedSeats} chỗ đã đặt`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Không huỷ
          </Button>
          <Button variant="danger" onClick={confirm} loading={m.pending}>
            Xác nhận huỷ đợt
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Alert tone="warning">
          Mọi đơn đang chờ/đã xác nhận sẽ bị huỷ, khoản đã thanh toán được hoàn 100% và khách nhận thông báo.
        </Alert>
        <TextAreaField id="dep-cancel-reason" label="Lý do huỷ đợt" value={reason} onChange={(e) => setReason(e.target.value)} error={err ?? m.fieldErrors.reason} required />
        {m.error && !m.error.errors.length && <Alert tone="error">{m.error.message}</Alert>}
      </div>
    </Dialog>
  );
}
