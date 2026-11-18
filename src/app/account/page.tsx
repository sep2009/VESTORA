import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { AuthForms } from "@/components/commerce/AuthForms";
import { AccountNav } from "@/components/commerce/AccountNav";
import { currentCustomer } from "@/server/commerce/page-auth";
import { ordersForUser } from "@/server/commerce/orders";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, sp] = await Promise.all([currentCustomer(), searchParams]);
  if (!user) return <PageShell eyebrow="Account" title="Sign in" intro="Sign in to see your orders, save addresses and keep favorites on every device."><AuthForms next={sp.next ?? null} /></PageShell>;
  const orders = ordersForUser(user.id);
  return (
    <PageShell eyebrow="Account" title={`Hello, ${user.name.split(" ")[0]}`} intro={user.email}>
      <AccountNav />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/account/orders" className="rounded-md border border-line p-5 hover:border-ink"><p className="font-display text-3xl">{orders.length}</p><p className="text-sm text-mute">Orders</p></Link>
        <Link href="/account/addresses" className="rounded-md border border-line p-5 hover:border-ink"><p className="font-display text-3xl">{user.addresses.length}</p><p className="text-sm text-mute">Saved addresses</p></Link>
        <Link href="/favorites" className="rounded-md border border-line p-5 hover:border-ink"><p className="font-display text-3xl">{user.favorites.length}</p><p className="text-sm text-mute">Favorites</p></Link>
      </div>
    </PageShell>
  );
}
