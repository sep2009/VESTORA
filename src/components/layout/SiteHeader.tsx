import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AccountMenu } from "./AccountMenu";
import { DepartmentStrip } from "./DepartmentStrip";
import { CartIndicator, FavoritesIndicator } from "./Indicators";
import { MobileNav } from "./MobileNav";
import { ModeToggle } from "./ModeToggle";
import { Container } from "./PageShell";
import { SearchPalette } from "./SearchPalette";
import { primaryLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <Container className="flex h-16 items-center gap-1.5 sm:gap-3">
        <MobileNav />
        <Logo />
        <div className="ml-1 sm:ml-4"><ModeToggle /></div>
        <nav aria-label="Primary" className="ml-6 hidden gap-6 xl:flex">
          {primaryLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-xs uppercase tracking-[0.14em] text-mute transition-colors hover:text-ink">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center">
          <SearchPalette />
          <span className="hidden sm:block"><FavoritesIndicator /></span>
          <span className="hidden sm:block"><AccountMenu /></span>
          <CartIndicator />
        </div>
      </Container>
      <DepartmentStrip />
    </header>
  );
}
