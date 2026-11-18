import type { Metadata } from "next";
import { ConfirmationView } from "@/components/commerce/ConfirmationView";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; cancelled?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <ConfirmationView id={id} token={sp.t ?? null} cancelledReturn={sp.cancelled === "1"} />;
}
