import Link from "next/link";
import { listProducts } from "@/server/catalog/repository";
import { CatalogNotice } from "@/components/ui/CatalogNotice";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const result = await listProducts();
  if (result.status !== "ok") return <CatalogNotice status={result.status} message={result.status === "error" ? result.message : undefined} />;
  if (result.data.length === 0) return <CatalogNotice status="empty" />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.map((p) => (
        <li key={p.id} className="rounded-xl border border-white/10 p-4">
          <Link href={`/products/${p.slug}`} className="font-medium">{p.name}</Link>
          {p.variants[0] && <p className="text-sm text-neutral-400">{formatMoney(p.variants[0].price)}</p>}
        </li>
      ))}
    </ul>
  );
}
