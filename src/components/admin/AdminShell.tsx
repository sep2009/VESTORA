import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { LogoutButton } from "./LogoutButton";

const links = [{ href: "/admin", label: "Dashboard" }, { href: "/admin/products", label: "Products" }, { href: "/admin/taxonomy", label: "Taxonomy" }, { href: "/admin/showroom", label: "Showroom" }];

/** Frame for every signed-in admin page. Role is shown so it is clear what the session may do. */
export function AdminShell({ role, title, intro, children }: { role: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <PageShell eyebrow={`Admin · ${role}`} title={title} intro={intro}>
      <nav aria-label="Admin" className="mb-8 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        {links.map((l) => <Link key={l.href} href={l.href} className="rounded-sm px-3 py-2 text-xs uppercase tracking-[0.14em] hover:bg-ink/8">{l.label}</Link>)}
        <span className="ml-auto"><LogoutButton /></span>
      </nav>
      {children}
    </PageShell>
  );
}
