import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Saved pieces" };

export default function Page() {
  return (
    <PageShell eyebrow="Favorites" title="Saved pieces" intro="Everything you have hearted, in one place.">
      <ComingSoon stage="the accounts stage">Hearts are already remembered on this device; the saved list view arrives with accounts.</ComingSoon>
    </PageShell>
  );
}
