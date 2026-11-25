import type { Metadata } from "next";
import { TryOnApp } from "@/components/tryon/TryOnApp";
import { CONSENT_VERSION, PHOTO_LIMITS, RETENTION } from "@/modules/tryon/core";
import { currentCustomer } from "@/server/commerce/page-auth";
import { getTryOnItems } from "@/server/catalog/tryon-items";
import { providerStatus } from "@/server/tryon/providers";
import { usageFor } from "@/server/tryon/jobs";

export const metadata: Metadata = { title: "Virtual try-on", description: "Try catalog products on an avatar, in 3D, or (when configured) with an AI photo service." };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ product?: string; mode?: string }> }) {
  const sp = await searchParams, user = await currentCustomer(), st = providerStatus();
  const config = {
    available: st.available, code: st.available ? "ok" : st.code, message: st.available ? null : st.message,
    provider: st.available ? { id: st.provider.id, label: st.provider.label, test: st.provider.test, retentionNote: st.provider.retentionNote } : null,
    limits: { maxMb: PHOTO_LIMITS.maxBytes / 1024 / 1024, minSide: PHOTO_LIMITS.minSide, maxSide: PHOTO_LIMITS.maxSide, retention: RETENTION },
    consentVersion: CONSENT_VERSION, signedIn: !!user, usage: user ? (await usageFor(user)) : null,
  };
  return <TryOnApp items={(await getTryOnItems())} config={config} initialSlug={sp.product ?? null} initialMode={sp.mode ?? null} />;
}
