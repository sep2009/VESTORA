import "server-only";
import type { TryOnProvider } from "./provider";
import { testProvider } from "./test-provider";

/**
 * Real provider adapters are registered here, one file each, once a provider is chosen and its documentation is read.
 * Intentionally EMPTY today: no real provider is integrated.
 */
const ADAPTERS: Record<string, () => TryOnProvider | null> = {
  // example (do not add until written from the provider's official docs):  acme: () => acmeAdapter(process.env.TRYON_API_KEY),
};

export type ProviderStatus =
  | { available: true; provider: TryOnProvider }
  | { available: false; code: "not_configured" | "adapter_missing" | "test_disabled" | "misconfigured"; message: string };

/** Decided only by environment variables: TRYON_PROVIDER = an adapter id, or "test" (development only). */
export function providerStatus(): ProviderStatus {
  const id = process.env.TRYON_PROVIDER?.trim();
  if (!id) return { available: false, code: "not_configured", message: "No AI try-on provider is configured on this server." };
  if (id === "test") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_TRYON !== "1") return { available: false, code: "test_disabled", message: "The test provider is disabled in production." };
    return { available: true, provider: testProvider() };
  }
  const make = ADAPTERS[id];
  if (!make) return { available: false, code: "adapter_missing", message: `TRYON_PROVIDER is set to “${id}”, but Vestora has no adapter for it yet. An adapter must be written from that provider’s documentation.` };
  const p = make();
  return p ? { available: true, provider: p } : { available: false, code: "misconfigured", message: `The “${id}” provider is missing its credentials or settings.` };
}
