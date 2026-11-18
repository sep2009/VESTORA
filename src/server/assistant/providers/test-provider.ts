import "server-only";
import { ProviderError, type AssistantProvider } from "./provider";

/**
 * DEVELOPMENT SCRIPTED PROVIDER. It is NOT an AI model: it uses the same tool functions a model would, in a fixed script, to exercise
 * tool calling, plan validation and failure handling. Replies are labelled "Scripted test model (not AI)". Behavior can be forced with
 * testMode to test bad output: hallucinate, badprice, garbage, overbudget, down, timeout. Enabled outside production, or with ALLOW_TEST_ASSISTANT=1.
 */
export function testAssistantProvider(): AssistantProvider {
  return {
    id: "test", label: "Scripted test model (not AI)", test: true,
    privacyNote: "This is a scripted development provider. Your message stays on this server and is not sent anywhere.",
    async respond({ tools, testMode, signal }) {
      const mode = testMode ?? "ok";
      if (mode === "down") throw new ProviderError("The model service could not be reached.", "provider_unreachable");
      if (mode === "timeout") { await new Promise((_, rej) => { const t = setTimeout(() => rej(new ProviderError("timed out", "timeout")), 60_000); signal.addEventListener("abort", () => { clearTimeout(t); rej(new ProviderError("aborted", "timeout")); }); }); }
      if (mode === "garbage") return { nope: true };
      const outfits = tools.buildOutfits();
      if (mode === "hallucinate") return { reply: "I found a great outfit for only $49.", outfits: [{ name: "Dream look", productIds: ["fake-product-1", outfits[0]?.productIds[0] ?? "x"] }], products: ["nope-999"], department: "atlantis" };
      if (mode === "badprice") return { reply: "This whole outfit costs just $12.", outfits: outfits.slice(0, 2).map((o) => ({ name: o.name, productIds: o.productIds })) };
      if (mode === "overbudget") { const all = tools.searchProducts({ limit: 40 }).sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); return { reply: "Premium picks.", outfits: [{ name: "Premium", productIds: all.filter((p, i, a) => a.findIndex((q) => q.kind === p.kind) === i).slice(0, 4).map((p) => p.id) }] }; }
      return { reply: "Here are outfits chosen with the catalog tools.", outfits: outfits.slice(0, 3).map((o) => ({ name: o.name, productIds: o.productIds })) };
    },
  };
}
