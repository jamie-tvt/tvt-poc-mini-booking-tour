"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Nút phụ cạnh tiêu đề (vd "Xoá tất cả"). */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
  className?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bảng trượt từ đáy (mobile): role="dialog" aria-modal, Esc / nút đóng / bấm nền để đóng,
 * giữ focus trong bảng, khoá cuộn trang khi mở, đóng thì trả focus về nút đã mở.
 */
export function BottomSheet({ open, onClose, title, headerAction, children, footer, closeLabel = "Đóng", className }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  // Portal ra <body>: thoát stacking context của khối cha (vd `isolate` của nền mờ) để luôn nằm trên cùng
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-ink/35 backdrop-blur-[3px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex max-h-[88dvh] w-full flex-col rounded-t-[20px] bg-white text-ink shadow-modal animate-[sheet-up_200ms_ease-out]",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-2">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <div className="flex items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft transition-colors duration-200 hover:bg-sky-soft hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && <div className="border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
