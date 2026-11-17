import type { ReactNode } from "react";

export const THEMES = ["luxury", "street", "minimal", "tech"] as const;
export type ThemeKey = (typeof THEMES)[number];

/** Gives a department its own visual identity by overriding design tokens for its subtree. */
export function ThemeScope({ theme, children, className }: { theme: string; children: ReactNode; className?: string }) {
  const known = (THEMES as readonly string[]).includes(theme);
  return <div data-theme={known ? theme : undefined} className={`bg-paper text-ink ${className ?? ""}`}>{children}</div>;
}
