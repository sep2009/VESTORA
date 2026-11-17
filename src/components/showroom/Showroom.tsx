"use client";
import dynamic from "next/dynamic";
import { Minimap } from "./Minimap";
import { ShowroomLoader } from "./ShowroomLoader";

const ShowroomScene = dynamic(() => import("./ShowroomScene"), { ssr: false, loading: () => <ShowroomLoader /> });

export default function Showroom({ departments }: { departments: { slug: string; name: string }[] }) {
  return (
    <div className="relative h-[62svh] min-h-96 w-full overflow-hidden rounded-lg border border-line md:h-[72svh]">
      <ShowroomScene />
      <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)]"><Minimap departments={departments} /></div>
      <p className="pointer-events-none absolute top-3 right-3 rounded-sm bg-surface/90 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-mute">Drag to look around</p>
    </div>
  );
}
