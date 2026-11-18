import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { AccountNav } from "@/components/commerce/AccountNav";
import { AddressManager } from "@/components/commerce/AccountForms";
import { requireCustomer } from "@/server/commerce/page-auth";

export const metadata: Metadata = { title: "Saved addresses", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireCustomer("/account/addresses");
  return <PageShell eyebrow="Account" title="Saved addresses"><AccountNav /><AddressManager initial={u.addresses} /></PageShell>;
}
