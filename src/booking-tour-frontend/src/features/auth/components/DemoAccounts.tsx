"use client";

import { KeyRound } from "lucide-react";
import { ROLE_LABEL } from "@/lib/utils/labels";
import type { Role } from "@/types/domain";

export const DEMO_PASSWORD = "12345678";

export const DEMO_ACCOUNTS: { email: string; role: Role; name?: string; note?: string }[] = [
  { email: "customer@example.com", role: "CUSTOMER", name: "Nguyễn Văn Hào", note: "có sẵn đơn" },
  { email: "mai.tran@example.com", role: "CUSTOMER" },
  { email: "guide@example.com", role: "TOUR_GUIDE", name: "Trần Quốc Hưng" },
  { email: "tuan.guide@example.com", role: "TOUR_GUIDE" },
  { email: "manager@example.com", role: "TOUR_MANAGER", name: "Nguyễn Thu Hà" },
  { email: "admin@example.com", role: "ADMIN", name: "Lê Hoàng Long" },
];

export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <section aria-labelledby="demo-heading" className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 id="demo-heading" className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="size-5 text-cta" aria-hidden="true" /> Tài khoản demo
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Mật khẩu chung: <code className="rounded bg-muted px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code>
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{a.email}</p>
              <p className="text-xs text-ink-soft">
                {ROLE_LABEL[a.role]}
                {a.name ? ` · ${a.name}` : ""}
                {a.note ? ` · ${a.note}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPick(a.email, DEMO_PASSWORD)}
              aria-label={`Điền nhanh tài khoản ${a.email}`}
              className="min-h-9 rounded-lg border border-brand px-3 text-xs font-semibold text-brand transition-colors duration-200 hover:bg-sky-soft"
            >
              Điền nhanh
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
