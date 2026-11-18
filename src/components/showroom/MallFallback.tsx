import Link from "next/link";
import { ZONES } from "@/modules/showroom/layout";

/**
 * The 2D way into the mall, for visitors without WebGL, with a failed 3D scene, or who prefer not to use it.
 * Every department of the 3D mall is listed with its tagline and links to its products in the shop.
 */
export function MallFallback({ departments, reason }: { departments: { slug: string; name: string; tagline: string }[]; reason: string }) {
  return (
    <section aria-label="Departments (2D)" className="rounded-lg border border-line bg-surface p-5 sm:p-8" data-testid="mall-fallback">
      <h2 className="font-display text-2xl">Browse the departments</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute" role="status">{reason} Everything in the mall is also in the shop, so you can browse and buy the same products here.</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => { const z = ZONES.find((x) => x.department === d.slug); return (
          <li key={d.slug}><Link href={`/shop?department=${d.slug}`} className="flex min-h-16 items-center gap-3 rounded-md border border-line p-4 hover:border-ink">
            <span aria-hidden="true" className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: z?.palette.accent ?? "#999" }} />
            <span><span className="block font-medium">{d.name}</span><span className="block text-sm text-mute">{d.tagline}</span></span></Link></li>); })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3 text-sm"><Link href="/shop" className="underline underline-offset-4">All products</Link><Link href="/assistant" className="underline underline-offset-4">Ask the stylist</Link><Link href="/style-creator" className="underline underline-offset-4">Outfit Studio</Link></div>
    </section>
  );
}
