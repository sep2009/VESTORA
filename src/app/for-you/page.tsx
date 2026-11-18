import type { Metadata } from "next";
import { ForYou } from "@/components/style/ForYou";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "For you", description: "Products, outfits and departments matched to your style profile." };

export default function Page() {
  return (
    <PageShell eyebrow="For you" title="Picked for your style" intro="Products, outfits and departments from our real catalog, matched to the answers you gave. Everything shown is in stock.">
      <ForYou />
    </PageShell>
  );
}
