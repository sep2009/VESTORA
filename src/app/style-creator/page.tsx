import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Outfit Studio" };

export default function Page() {
  return (
    <PageShell eyebrow="Outfit Studio" title="Outfit Studio" intro="Combine catalog products into outfits on a 3D avatar.">
      <ComingSoon stage="not built yet">Needs a 3D avatar and fitting assets that do not exist yet. Outfits will reference catalog product ids, like the cart and favorites.</ComingSoon>
    </PageShell>
  );
}
