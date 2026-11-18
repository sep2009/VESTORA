import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantPage } from "@/components/assistant/AssistantPage";
import { Container } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Stylist", description: "Build outfits, find matches and locate departments with a stylist that only recommends products that are in stock." };

export default function Page() {
  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-6 max-w-3xl"><p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-ink">Stylist</p><h1 className="font-display text-headline">Your personal stylist</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">Describe the occasion, season or style. I’ll build complete outfits from what’s in stock, explain them, and show you where to find them in the mall.</p></header>
      <Suspense fallback={null}><AssistantPage /></Suspense>
    </Container>
  );
}
