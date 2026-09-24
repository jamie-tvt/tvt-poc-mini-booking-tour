"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { adminService } from "../services/adminService";

export function SettingsForm() {
  const q = useApiQuery("settings", adminService.settings);
  const m = useMutation(adminService.saveSettings);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) setValues(Object.fromEntries(q.data.map((s) => [s.key, s.value])));
  }, [q.data]);

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const settings = q.data;
  const changed = settings.filter((s) => values[s.key] !== undefined && values[s.key] !== s.value);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await m.run(changed.map((s) => ({ key: s.key, value: values[s.key] ?? s.value })));
    if (res !== undefined) {
      setSaved(true);
      void q.reload();
    }
  }

  return (
    <div>
      <PageHeader title="Cài đặt hệ thống" description="Tham số nghiệp vụ: thời gian giữ chỗ, chính sách hoàn tiền, giá trẻ em…" />
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {settings.map((s) => (
            <TextField
              key={s.key}
              id={`setting-${s.key}`}
              label={s.key}
              hint={s.description}
              value={values[s.key] ?? ""}
              onChange={(e) => {
                setSaved(false);
                setValues((v) => ({ ...v, [s.key]: e.target.value }));
              }}
              error={m.fieldErrors[s.key]}
              className="font-mono"
            />
          ))}
          {saved && <Alert tone="success">Đã lưu cài đặt.</Alert>}
          {m.error && <Alert tone="error">{m.error.message}</Alert>}
          <Button type="submit" loading={m.pending} disabled={changed.length === 0} className="self-start">
            <Save className="size-4" aria-hidden="true" /> Lưu cài đặt{changed.length ? ` (${changed.length})` : ""}
          </Button>
        </form>
      </Card>
    </div>
  );
}
