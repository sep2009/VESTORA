import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

function StateBox({ icon, title, children, action, tone }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode; tone?: "danger" }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <span className={cn("grid size-12 place-items-center rounded-full bg-ink/6", tone === "danger" && "text-danger")}><Icon name={icon} size={24} /></span>
      <h2 className="font-display text-xl">{title}</h2>
      {children && <p className="text-sm leading-relaxed text-mute">{children}</p>}
      {action}
    </div>
  );
}

export function EmptyState(p: { title: string; children?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return <StateBox icon={p.icon ?? "box"} title={p.title} action={p.action}>{p.children}</StateBox>;
}

export function ErrorState(p: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return <StateBox icon="alert" tone="danger" title={p.title ?? "Something went wrong"} action={p.action}>{p.children}</StateBox>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-mute">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none" />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-sm bg-ink/8 motion-reduce:animate-none", className)} />;
}
