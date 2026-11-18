import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { FavoritesSync } from "@/components/commerce/FavoritesSync";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ToastViewport } from "@/components/feedback/ToastViewport";
import { NavMemory } from "@/components/layout/NavMemory";
import { Suspense } from "react";
import { getCatalog } from "@/server/catalog/catalog";

export const metadata: Metadata = {
  title: { default: "Vestora — Immersive fashion", template: "%s — Vestora" },
  description: "A 3D fashion showroom with virtual fitting, outfit creation and AI styling.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const slugs = Object.fromEntries(getCatalog().products.map((p) => [p.id, p.slug]));
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">Skip to content</a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
        <Suspense fallback={null}><NavMemory productSlugs={slugs} /></Suspense>
        <ToastViewport />
        <CartDrawer />
        <FavoritesSync />
      </body>
    </html>
  );
}
