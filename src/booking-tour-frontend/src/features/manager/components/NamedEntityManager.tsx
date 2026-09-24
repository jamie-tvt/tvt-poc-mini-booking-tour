"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";

interface Entity {
  id: number;
  name: string;
  description?: string;
  tourCount?: number;
}
type Payload = { name: string; description?: string };

interface Props<T extends Entity> {
  title: string;
  description: string;
  entityLabel: string; // "danh mục" | "địa điểm"
  withDescription?: boolean;
  queryKey: string;
  list: () => Promise<T[]>;
  create: (p: Payload) => Promise<T>;
  update: (id: number, p: Payload) => Promise<T>;
  remove: (id: number) => Promise<unknown>;
}

/** CRUD inline cho danh mục / địa điểm. */
export function NamedEntityManager<T extends Entity>(props: Props<T>) {
  const { entityLabel, withDescription } = props;
  const q = useApiQuery(props.queryKey, props.list);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [nameErr, setNameErr] = useState<string | undefined>();
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [toDelete, setToDelete] = useState<T | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const create = useMutation(props.create);
  const update = useMutation(props.update);
  const remove = useMutation(props.remove);

  const payload = (n: string, d: string): Payload => (withDescription ? { name: n.trim(), description: d.trim() || undefined } : { name: n.trim() });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameErr(`Tên ${entityLabel} tối thiểu 2 ký tự.`);
      return;
    }
    setNameErr(undefined);
    const res = await create.run(payload(name, desc));
    if (res) {
      setName("");
      setDesc("");
      setNotice(`Đã thêm ${entityLabel} “${res.name}”.`);
      void q.reload();
    }
  }

  async function onSave(id: number) {
    if (editName.trim().length < 2) return;
    const res = await update.run(id, payload(editName, editDesc));
    if (res) {
      setEditId(null);
      setNotice(`Đã cập nhật ${entityLabel}.`);
      void q.reload();
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    const res = await remove.run(toDelete.id);
    if (res !== undefined) {
      setNotice(`Đã xoá ${entityLabel} “${toDelete.name}”.`);
      setToDelete(null);
      void q.reload();
    }
  }

  const list = q.data ?? [];
  return (
    <div>
      <PageHeader title={props.title} description={props.description} />
      <form onSubmit={onCreate} noValidate className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-[1fr_1.5fr_auto] md:items-start">
        <TextField id="ne-name" label={`Tên ${entityLabel} mới`} value={name} onChange={(e) => setName(e.target.value)} error={nameErr ?? create.fieldErrors.name} required />
        {withDescription ? (
          <TextField id="ne-desc" label="Mô tả" value={desc} onChange={(e) => setDesc(e.target.value)} error={create.fieldErrors.description} />
        ) : (
          <div className="hidden md:block" />
        )}
        <Button type="submit" loading={create.pending} className="md:mt-7">
          <Plus className="size-4" aria-hidden="true" /> Thêm {entityLabel}
        </Button>
      </form>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      {(create.error ?? update.error) && !(create.error ?? update.error)?.errors.length && (
        <Alert tone="error" className="mb-4">
          {(create.error ?? update.error)?.message}
        </Alert>
      )}

      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : list.length === 0 ? (
        <EmptyState title={`Chưa có ${entityLabel} nào`} />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((item) => (
            <li key={item.id} className="rounded-xl border border-line bg-white p-3">
              {editId === item.id ? (
                <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
                  <TextField id={`ne-edit-name-${item.id}`} label={`Tên ${entityLabel}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  {withDescription ? (
                    <TextField id={`ne-edit-desc-${item.id}`} label="Mô tả" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  ) : (
                    <div className="hidden md:block" />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => onSave(item.id)} loading={update.pending}>
                      <Save className="size-4" aria-hidden="true" /> Lưu
                    </Button>
                    <Button variant="ghost" onClick={() => setEditId(null)} aria-label="Huỷ sửa">
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    {item.description && <p className="text-sm text-ink-soft">{item.description}</p>}
                    {item.tourCount !== undefined && <p className="text-xs text-ink-soft">{item.tourCount} tour</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditId(item.id);
                        setEditName(item.name);
                        setEditDesc(item.description ?? "");
                      }}
                      aria-label={`Sửa ${entityLabel} ${item.name}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" /> Sửa
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(item)} aria-label={`Xoá ${entityLabel} ${item.name}`}>
                      <Trash2 className="size-4" aria-hidden="true" /> Xoá
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => {
          setToDelete(null);
          remove.reset();
        }}
        title={`Xoá ${entityLabel}?`}
        description={toDelete?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Không xoá
            </Button>
            <Button variant="danger" onClick={onDelete} loading={remove.pending}>
              Xác nhận xoá
            </Button>
          </>
        }
      >
        <p className="text-sm">Thao tác này không thể hoàn tác.</p>
        {remove.error && <Alert tone="error" className="mt-3">{remove.error.message}</Alert>}
      </Dialog>
    </div>
  );
}
