import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { listDepartments } from "@/server/catalog/repository";
import { AccountMenu } from "./AccountMenu";
import { CartIndicator, FavoritesIndicator } from "./Indicators";
import { MobileNav } from "./MobileNav";
import { SearchButton } from "./SearchButton";
import { Container } from "./PageShell";
import { primaryLinks } from "./nav-links";

export async function SiteHeader() {
  const result = await listDepartments();
  const departments = result.status === "ok" ? result.data : [];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <Container className="flex h-16 items-center gap-4">
        <MobileNav departments={departments} />
        <Logo />
        <nav aria-label="Primary" className="ml-8 hidden gap-7 lg:flex">
          {primaryLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm uppercase tracking-[0.14em] text-mute transition-colors hover:text-ink">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center">
          <SearchButton />
          <span className="hidden sm:block"><FavoritesIndicator /></span>
          <AccountMenu />
          <CartIndicator />
        </div>
      </Container>
      {departments.length > 0 && (
        <nav aria-label="Departments" className="border-t border-line">
          <Container>
            <ul className="flex gap-6 overflow-x-auto py-2.5 text-xs uppercase tracking-[0.18em]">
              {departments.map((d) => (
                <li key={d.slug} className="shrink-0"><Link href={`/shop?dept=${d.slug}`} className="text-mute hover:text-ink">{d.name}</Link></li>
              ))}
            </ul>
          </Container>
        </nav>
      )}
    </header>
  );
}
