import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Label } from "@/components/product/ProductLabel";
import { DEPARTMENT_LABEL } from "@/modules/catalog/kinds";
import { getIndex } from "@/server/catalog/index-data";

export const metadata: Metadata = { title: "Brands" };
export const dynamic = "force-dynamic";

export default function BrandsPage() {
  const { brands } = getIndex();
  return (
    <PageShell eyebrow="Shop mode" title="Brands" intro="Every brand in the catalog. Brand names are shown for identification only and do not imply any affiliation or endorsement.">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <li key={b.slug} className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-2"><h2 className="font-display text-xl">{b.name}</h2>{b.demo && <Label kind="ink">Demo brand</Label>}</div>
            <p className="mt-1 text-sm text-mute">{b.count} product{b.count === 1 ? "" : "s"}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.14em]">
              <Link href={`/shop?brand=${b.slug}`} className="text-accent-ink underline">Browse products</Link>
              {b.department && <Link href={`/?dept=${b.department}`} className="underline">Find in 3D mall ({DEPARTMENT_LABEL[b.department]})</Link>}
            </div>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
