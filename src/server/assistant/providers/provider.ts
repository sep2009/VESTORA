import "server-only";
import type { AItem, AState, OutfitCard } from "@/modules/assistant/core";

/**
 * Contract between the stylist and a language-model service. Everything provider-specific (endpoints, auth, request and tool-call
 * formats, pricing, data terms) belongs in ONE adapter file implementing this interface. There is deliberately NO real adapter yet:
 * it must be written from the chosen provider's official documentation once a provider and credentials are decided (docs/ASSISTANT.md).
 *
 * The model never sees or invents product data. It works through `tools` (backend functions over the product database) and returns a
 * PLAN made of product ids it received from those tools. The server validates every id against the database and renders prices, stock,
 * sizes and links itself; anything the model says that cannot be verified is dropped.
 */
export type ToolProduct = { id: string; name: string; brand: string; kind: string; department: string; price: number | null; currency: string; colors: string[]; sizesInStock: string[] };
export type ToolApi = {
  /** Search in-stock products. All filters optional. Prices in minor units. */
  searchProducts(f: { kinds?: string[]; departments?: string[]; colors?: string[]; maxPrice?: number; limit?: number }): ToolProduct[];
  getProduct(id: string): ToolProduct | null;
  /** Rule-based outfit candidates for the current request (ids only; the server re-checks them). */
  buildOutfits(): { name: string; productIds: string[] }[];
  matchesFor(productId: string, slot: string): ToolProduct[];
  departmentInfo(slug: string): { slug: string; name: string; available: number } | null;
};
export type ProviderRequest = {
  message: string; history: { role: "user" | "assistant"; text: string }[];
  /** Non-identifying summary of what the rules understood (occasion, season, budget...). No profile, name or email is ever included. */
  understanding: { intent: string; understood: string[]; budget: number | null };
  tools: ToolApi; testMode?: string; signal: AbortSignal;
};
export interface AssistantProvider {
  readonly id: string; readonly label: string;
  /** True only for the scripted development provider, which is not an AI model and is always labelled so. */
  readonly test: boolean;
  /** What happens to the shopper's message: shown in the UI before anything is sent. */
  readonly privacyNote: string;
  /** Returns the model's plan (validated by the caller) or throws ProviderError. */
  respond(req: ProviderRequest): Promise<unknown>;
}
export class ProviderError extends Error { constructor(message: string, public code: string) { super(message); this.name = "ProviderError"; } }
export type { AItem, AState, OutfitCard };
