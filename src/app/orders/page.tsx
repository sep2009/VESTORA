import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Your orders" };

export default function Page() {
  return (
    <PageShell eyebrow="Orders" title="Your orders" intro="Track and review past purchases.">
      <ComingSoon stage="the checkout stage">Orders appear here once checkout exists.</ComingSoon>
    </PageShell>
  );
}
