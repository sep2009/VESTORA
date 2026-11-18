import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ResetForm } from "@/components/commerce/AuthForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PageShell eyebrow="Account" title="Choose a new password">{token ? <ResetForm token={token} /> : <p className="text-sm text-mute">This link is incomplete. Request a new one from the sign-in page.</p>}</PageShell>;
}
