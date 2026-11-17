"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

type Props = { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string };

/** Native <dialog>: focus trap, Escape to close and inert background come from the browser. */
function BaseDialog({ open, onClose, label, children, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cn("bg-surface text-ink shadow-pop backdrop:bg-ink/50", className)}
    >
      <div className="flex h-full flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{label}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${label}`} className="grid size-10 place-items-center rounded-sm hover:bg-ink/8">
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}

export function Modal(props: Props) {
  return <BaseDialog {...props} className={cn("m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg", props.className)} />;
}

export function Drawer({ side = "right", ...props }: Props & { side?: "left" | "right" }) {
  return (
    <BaseDialog
      {...props}
      className={cn(
        "fixed top-0 m-0 h-dvh max-h-none w-[min(24rem,100vw)]",
        side === "right" ? "right-0 left-auto" : "left-0 right-auto",
        props.className,
      )}
    />
  );
}
