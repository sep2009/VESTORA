import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Checkout" };

export default function Page() {
  return (
    <PageShell eyebrow="Checkout" title="Checkout" intro="Review your bag and pay securely.">
      <ComingSoon stage="the checkout stage">Payments need a payment provider and are built in a later stage.</ComingSoon>
    </PageShell>
  );
}
