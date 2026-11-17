import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Your account" };

export default function Page() {
  return (
    <PageShell eyebrow="Account" title="Your account" intro="Profile, preferences and measurements.">
      <ComingSoon stage="the accounts stage">Sign-in and profiles arrive with authentication.</ComingSoon>
    </PageShell>
  );
}
