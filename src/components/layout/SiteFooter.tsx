import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Container } from "./PageShell";
import { accountLinks, primaryLinks } from "./nav-links";

function Column({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-mute">{title}</h2>
      <ul className="space-y-2 text-sm">
        {links.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-accent-ink">{l.label}</Link></li>)}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mute">An immersive fashion destination: explore the showroom, try pieces on and build your own style.</p>
        </div>
        <Column title="Explore" links={primaryLinks} />
        <Column title="You" links={accountLinks} />
      </Container>
      <Container className="border-t border-line py-5 text-xs text-mute">© {new Date().getFullYear()} Vestora</Container>
    </footer>
  );
}
