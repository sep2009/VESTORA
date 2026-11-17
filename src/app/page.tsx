import Link from "next/link";
import Showroom from "@/components/showroom/Showroom";
import { Container } from "@/components/layout/PageShell";
import { Icon } from "@/components/ui/Icon";
import { listDepartments, listProducts } from "@/server/catalog/repository";
import type { ShowroomCatalogProduct } from "@/modules/showroom/types";

const entries = [
  { href: "/virtual-try-on", n: "01", title: "Try on", text: "See pieces on an avatar built to your proportions." },
  { href: "/style-quiz", n: "02", title: "Style quiz", text: "Tell us your taste and we shape the showroom around it." },
  { href: "/assistant", n: "03", title: "Assistant", text: "Ask for an outfit, a fit or an occasion." },
];

export default async function HomePage() {
  const [deptResult, productResult] = await Promise.all([listDepartments(), listProducts()]);
  const departments = deptResult.status === "ok" ? deptResult.data : [];
  const slugById = new Map(departments.map((d) => [d.id, d.slug]));
  const catalog: ShowroomCatalogProduct[] = productResult.status === "ok"
    ? productResult.data.flatMap((p) => {
        const departmentSlug = slugById.get(p.departmentId);
        return departmentSlug ? [{ id: p.id, slug: p.slug, name: p.name, departmentSlug, modelUrl: p.assets.modelUrl, imageUrl: p.assets.images[0] ?? null, colorHex: p.variants[0]?.color.hex ?? null }] : [];
      })
    : [];
  return (
    <>
      <Container className="pt-10 pb-8 sm:pt-16">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-accent-ink">The showroom</p>
        <h1 className="max-w-4xl font-display text-display">Fashion, <em className="not-italic text-accent-ink">exhibited</em> in three dimensions.</h1>
      </Container>
      <Container><Showroom catalog={catalog} /></Container>
      <Container className="pt-16">
        <ul className="grid border-t border-line md:grid-cols-3 md:divide-x md:divide-line">
          {entries.map((e) => (
            <li key={e.href} className="border-b border-line md:border-b-0">
              <Link href={e.href} className="group flex h-full flex-col gap-6 px-0 py-8 md:px-8 md:first:pl-0">
                <span className="text-xs tracking-[0.2em] text-mute">{e.n}</span>
                <h2 className="font-display text-3xl">{e.title}</h2>
                <p className="max-w-xs text-sm leading-relaxed text-mute">{e.text}</p>
                <span className="mt-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-transform group-hover:translate-x-1 motion-reduce:transition-none">Open <Icon name="arrow" size={16} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
