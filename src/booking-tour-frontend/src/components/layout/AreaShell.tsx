"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { isActivePath, MANAGER_NAV, OPERATOR_NAV, type NavItem } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";

const NAVS = { manager: MANAGER_NAV, operator: OPERATOR_NAV };

/**
 * Khung khu vực quản trị: sidebar trên desktop, menu thu gọn trên mobile.
 * Layout server truyền `navKey` (NavItem có RegExp không truyền qua biên server → client được).
 */
export function AreaShell({
  title,
  nav: navProp,
  navKey,
  children,
}: {
  title: string;
  nav?: NavItem[];
  navKey?: keyof typeof NAVS;
  children: React.ReactNode;
}) {
  const nav = navProp ?? (navKey ? NAVS[navKey] : []);
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const links = (
    <ul className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = isActivePath(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active ? "bg-brand text-white" : "text-ink hover:bg-sky-soft",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="flex items-center justify-between lg:block">
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-ink-soft">{title}</p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium lg:hidden"
            aria-expanded={open}
            aria-controls="area-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <PanelLeft className="size-4" aria-hidden="true" /> {open ? "Đóng menu" : "Menu khu vực"}
          </button>
        </div>
        <nav id="area-nav" aria-label={title} className={cn("mt-3 rounded-xl border border-line bg-white p-2 lg:block", open ? "block" : "hidden")}>
          {links}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
