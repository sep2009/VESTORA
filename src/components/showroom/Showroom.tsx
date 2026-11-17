"use client";
import dynamic from "next/dynamic";

const ShowroomScene = dynamic(() => import("./ShowroomScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-neutral-400">Loading showroom…</div>,
});

export default function Showroom() {
  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-2xl border border-white/10">
      <ShowroomScene />
    </div>
  );
}
