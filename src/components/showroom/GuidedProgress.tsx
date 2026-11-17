"use client";
import { useCameraStore } from "@/stores/camera-store";
import { cn } from "@/lib/cn";
import { seekGuidedStop } from "./GuidedTrack";

/** Where you are in the guided tour. Dots jump to a stop by scrolling there (so reverse scrolling stays natural). */
export function GuidedProgress() {
  const { index, count, label } = useCameraStore((s) => s.guided);
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface/95 px-3 py-2 shadow-card backdrop-blur" aria-live="polite">
      <p className="text-xs uppercase tracking-[0.14em]"><span className="text-mute">{String(index + 1).padStart(2, "0")}/{String(count).padStart(2, "0")}</span> · {label}</p>
      <ol className="hidden items-center gap-1.5 sm:flex" aria-label="Tour stops">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <button type="button" onClick={() => seekGuidedStop(i)} aria-label={`Go to stop ${i + 1}`} aria-current={i === index}
              className={cn("block size-2.5 rounded-full border border-ink/40", i === index ? "bg-ink" : "bg-transparent hover:bg-ink/30")} />
          </li>
        ))}
      </ol>
    </div>
  );
}
