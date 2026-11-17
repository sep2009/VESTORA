import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function Page() {
  return (
    <PageShell eyebrow="Admin" title="Admin dashboard" intro="Manage products, inventory and orders.">
      <ComingSoon stage="the admin stage">Access control and catalog management are built in a later stage.</ComingSoon>
    </PageShell>
  );
}
