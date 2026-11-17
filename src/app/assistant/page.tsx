import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Your shopping assistant" };

export default function Page() {
  return (
    <PageShell eyebrow="Assistant" title="Your shopping assistant" intro="Ask for an outfit, a fit or an occasion.">
      <ComingSoon stage="the AI stage">The assistant needs a server-side AI key and is built in a later stage.</ComingSoon>
    </PageShell>
  );
}
