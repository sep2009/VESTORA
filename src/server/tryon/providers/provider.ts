import "server-only";
import type { GarmentCategory } from "@/modules/tryon/core";

/**
 * Contract between Vestora and a virtual try-on service. Everything provider-specific (endpoints, auth, request shape, pricing, data
 * rules) belongs inside ONE adapter file that implements this interface, and nowhere else. Components never import a provider.
 *
 * There is deliberately no real adapter in this repository yet. A real one must be written from the chosen provider's official
 * documentation once the provider and credentials are decided (see docs/TRYON.md). Do not guess an API.
 */
export type TryOnSubmit = {
  jobId: string;
  /** The shopper's photo with metadata already removed. Never logged, never stored by the adapter. */
  photo: { bytes: Uint8Array; mime: "image/jpeg" | "image/png" | "image/webp" };
  /** The catalog product being tried on. `imageUrl` is the product's own picture (absolute URL). */
  garment: { productId: string; name: string; category: GarmentCategory; imageUrl: string };
  /** Honored only by the development test provider. */
  testMode?: string;
};
export type TryOnPoll =
  | { state: "processing"; progress?: number }
  | { state: "succeeded"; image: { bytes: Uint8Array; mime: string } }
  | { state: "failed"; code: string; message: string; retryable: boolean };

export interface TryOnProvider {
  readonly id: string;
  readonly label: string;
  /** True only for the development test provider: its output is not AI-generated and is always labelled so. */
  readonly test: boolean;
  readonly supports: readonly GarmentCategory[];
  /** What the provider says about keeping photos, shown to the shopper before they consent. Must come from the provider's own terms. */
  readonly retentionNote: string;
  /** Send the job. Throw TryOnProviderError for expected failures (rejected input, quota, unreachable). */
  submit(input: TryOnSubmit): Promise<{ providerJobId: string }>;
  poll(providerJobId: string): Promise<TryOnPoll>;
  /** Ask the provider to delete its copies, where its API supports that. */
  delete?(providerJobId: string): Promise<void>;
}

export class TryOnProviderError extends Error {
  constructor(message: string, public code: string, public retryable = false) { super(message); this.name = "TryOnProviderError"; }
}
