"use client";
import { useEffect } from "react";
import { useToasts, type Toast } from "@/stores/toast-store";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);
  return (
    <li
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-md border bg-surface px-4 py-3 text-sm shadow-pop animate-[vestora-toast-in_200ms_var(--ease-soft)]",
        toast.tone === "error" ? "border-danger" : toast.tone === "success" ? "border-ok" : "border-line",
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="grid size-7 place-items-center rounded-sm hover:bg-ink/8">
        <Icon name="close" size={16} />
      </button>
    </li>
  );
}

export function ToastViewport() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <ul role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm flex-col gap-2 sm:right-4 sm:left-auto sm:mx-0">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </ul>
  );
}
