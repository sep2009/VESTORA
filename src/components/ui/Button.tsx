import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/85",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-ink/8",
};
const sizes: Record<Size, string> = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-sm", lg: "h-14 px-8 text-base" };

type Common = { variant?: Variant; size?: Size; children: ReactNode; className?: string };
type AsLink = Common & { href: string } & { onClick?: undefined; disabled?: undefined };
type AsButton = Common & { href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>;

/** Links render <a>, everything else renders <button>. Tracking is wide for an editorial feel. */
export function Button(props: AsLink | AsButton) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-medium uppercase tracking-[0.12em] transition-colors",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant], sizes[size], className,
  );
  if (props.href !== undefined) return <Link href={props.href} className={classes}>{children}</Link>;
  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, ...rest } = props;
  return <button type="button" className={classes} {...rest}>{children}</button>;
}
