import Link from "next/link";

const links = [{ href: "/account", label: "Overview" }, { href: "/account/orders", label: "Orders" }, { href: "/account/addresses", label: "Addresses" }, { href: "/account/profile", label: "Profile" }, { href: "/favorites", label: "Favorites" }];
export function AccountNav() {
  return <nav aria-label="Account" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">{links.map((l) => <Link key={l.href} href={l.href} className="rounded-sm px-3 py-2 text-xs uppercase tracking-[0.14em] hover:bg-ink/8">{l.label}</Link>)}</nav>;
}
