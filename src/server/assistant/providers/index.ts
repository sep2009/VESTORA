import "server-only";
import type { AssistantProvider } from "./provider";
import { testAssistantProvider } from "./test-provider";

/** Real adapters are registered here, one file each, after the provider's documentation is read. EMPTY today: no real model is integrated. */
const ADAPTERS: Record<string, () => AssistantProvider | null> = {};

export type ProviderStatus = { available: true; provider: AssistantProvider } | { available: false; code: "not_configured" | "adapter_missing" | "test_disabled" | "misconfigured"; message: string };
/** Chosen only by ASSISTANT_PROVIDER ("test" for development). Not configured is a normal state: the rule-based stylist works without any model. */
export function assistantProviderStatus(): ProviderStatus {
  const id = process.env.ASSISTANT_PROVIDER?.trim();
  if (!id) return { available: false, code: "not_configured", message: "No AI model is connected. The stylist is using its built-in rules." };
  if (id === "test") return process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_ASSISTANT !== "1" ? { available: false, code: "test_disabled", message: "The test provider is disabled in production." } : { available: true, provider: testAssistantProvider() };
  const make = ADAPTERS[id];
  if (!make) return { available: false, code: "adapter_missing", message: `ASSISTANT_PROVIDER is set to “${id}”, but Vestora has no adapter for it yet. The stylist is using its built-in rules.` };
  const p = make();
  return p ? { available: true, provider: p } : { available: false, code: "misconfigured", message: `The “${id}” provider is missing its credentials or settings. The stylist is using its built-in rules.` };
}
