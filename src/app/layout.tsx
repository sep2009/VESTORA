import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vestora — Immersive fashion",
  description: "A 3D fashion showroom with virtual fitting, outfit creation and AI styling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <Link href="/" className="text-lg font-semibold tracking-widest">VESTORA</Link>
          <nav className="flex gap-6 text-sm text-neutral-300">
            <Link href="/shop">Shop</Link>
            <Link href="/cart">Cart</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
