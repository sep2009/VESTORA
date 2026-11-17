"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { resolveDisplays } from "@/modules/showroom/resolve";
import type { ShowroomCatalogProduct } from "@/modules/showroom/types";
import { DisplayInfo } from "./DisplayInfo";
import { Minimap } from "./Minimap";
import { ShowroomLoader } from "./ShowroomLoader";

const ShowroomScene = dynamic(() => import("./ShowroomScene"), { ssr: false, loading: () => <ShowroomLoader /> });

export default function Showroom({ catalog }: { catalog: ShowroomCatalogProduct[] }) {
  const displays = useMemo(() => resolveDisplays(catalog), [catalog]);
  return (
    <div className="relative h-[68svh] min-h-[28rem] w-full overflow-hidden rounded-lg border border-line md:h-[78svh]">
      <ShowroomScene displays={displays} />
      <div className="absolute top-3 left-3"><Minimap /></div>
      <div className="absolute bottom-3 left-3 max-sm:right-3"><DisplayInfo displays={displays} /></div>
      <p className="pointer-events-none absolute top-3 right-3 hidden rounded-sm bg-surface/90 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-mute sm:block">Drag to orbit · scroll to zoom · click a display</p>
    </div>
  );
}
