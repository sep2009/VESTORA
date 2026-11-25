import type { Metadata } from "next";
import { StyleQuiz } from "@/components/style/StyleQuiz";
import { PageShell } from "@/components/layout/PageShell";
import { getFacts, getStyleItems } from "@/server/catalog/style-items";

export const metadata: Metadata = { title: "Find your style", description: "A short style quiz that tunes recommendations to your taste." };
export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <PageShell eyebrow="Style quiz" title="Find your style" intro="Tell us what you like. We turn your answers into a style profile and match it to real products.">
      <StyleQuiz facts={(await getFacts(await getStyleItems()))} />
    </PageShell>
  );
}
