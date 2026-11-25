import type { Metadata } from "next";
import { OutfitStudio } from "@/components/outfit/OutfitStudio";
import { getStudioItems } from "@/server/catalog/studio";

export const metadata: Metadata = { title: "Outfit Studio", description: "Combine real catalog products into outfits on a 3D avatar preview." };
export const dynamic = "force-dynamic";

export default async function Page() {
  return <OutfitStudio items={(await getStudioItems())} />;
}
