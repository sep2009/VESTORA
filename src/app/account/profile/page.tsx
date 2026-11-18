import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { AccountNav } from "@/components/commerce/AccountNav";
import { ProfileForms } from "@/components/commerce/AccountForms";
import { requireCustomer } from "@/server/commerce/page-auth";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireCustomer("/account/profile");
  return <PageShell eyebrow="Account" title="Profile"><AccountNav /><ProfileForms name={u.name} phone={u.phone} email={u.email} /></PageShell>;
}
