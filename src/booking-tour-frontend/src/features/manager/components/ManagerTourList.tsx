"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatVnd } from "@/lib/utils/format";
import { TOUR_STATUS, TOUR_STATUSES } from "@/lib/utils/labels";
import type { TourSummaryDto } from "@/types/domain";
import { managerService } from "../services/managerService";

export function ManagerTourList() {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [toDelete, setToDelete] = useState<TourSummaryDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(`mgr-tours-${keyword}-${status}-${page}`, () => managerService.tours({ keyword, status, page }));
  const del = useMutation(managerService.deleteTour);

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await del.run(toDelete.id);
    if (res === undefined) return;
    setNotice(
      res && res.deleted === false
        ? `Tour "${toDelete.title}" đã có đợt/đơn nên được chuyển sang Ngừng hoạt động.`
        : `Đã xoá tour "${toDelete.title}".`,
    );
    setToDelete(null);
    void q.reload();
  }

  return (
    <div>
      <PageHeader
        title="Quản lý tour"
        description="Tất cả tour ở mọi trạng thái."
        actions={
          <LinkButton href="/manager/tours/new">
            <Plus className="size-4" aria-hidden="true" /> Tạo tour mới
          </LinkButton>
        }
      />
      <form
        className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setKeyword(keywordInput.trim());
          setPage(0);
        }}
      >
        <TextField id="mt-keyword" label="Tìm tour" placeholder="Mã hoặc tên tour" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
        <SelectField
          id="mt-status"
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {TOUR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TOUR_STATUS[s].label}
            </option>
          ))}
        </SelectField>
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" /> Tìm kiếm
        </Button>
      </form>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}

      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Không có tour nào" description="Thử đổi từ khoá hoặc trạng thái." />
      ) : (
        <>
          <Table caption="Danh sách tour">
            <thead>
              <tr>
                <Th>Mã</Th>
                <Th>Tên tour</Th>
                <Th>Danh mục</Th>
                <Th>Giá gốc</Th>
                <Th>Đợt mở</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((t) => (
                <tr key={t.id}>
                  <Td className="font-mono text-xs">{t.tourCode}</Td>
                  <Td>
                    <Link href={`/manager/tours/${t.id}`} className="font-semibold hover:text-brand hover:underline">
                      {t.title}
                    </Link>
                    <span className="block text-xs text-ink-soft">{t.destination}</span>
                  </Td>
                  <Td>{t.categoryName}</Td>
                  <Td>{formatVnd(t.price)}</Td>
                  <Td>{t.openDepartureCount}</Td>
                  <Td>
                    <Badge tone={TOUR_STATUS[t.status]?.tone}>{TOUR_STATUS[t.status]?.label ?? t.status}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <LinkButton href={`/manager/tours/${t.id}`} variant="ghost" size="sm" aria-label={`Sửa tour ${t.title}`}>
                        <Pencil className="size-4" aria-hidden="true" /> Sửa
                      </LinkButton>
                      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setToDelete(t)} aria-label={`Xoá tour ${t.title}`}>
                        <Trash2 className="size-4" aria-hidden="true" /> Xoá
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xoá tour?"
        description={toDelete ? `${toDelete.tourCode} — ${toDelete.title}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Không xoá
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={del.pending}>
              Xác nhận xoá
            </Button>
          </>
        }
      >
        <p className="text-sm">Tour chưa có đợt khởi hành sẽ bị xoá hẳn. Tour đã có đợt hoặc đơn sẽ được chuyển sang “Ngừng hoạt động”.</p>
        {del.error && <Alert tone="error" className="mt-3">{del.error.message}</Alert>}
      </Dialog>
    </div>
  );
}
