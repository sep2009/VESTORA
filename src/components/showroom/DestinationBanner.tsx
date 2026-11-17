"use client";
import { useCameraStore } from "@/stores/camera-store";
import { getZone } from "@/modules/showroom/layout";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { Button } from "@/components/ui/Button";

/** Names the room the camera has been sent to and offers the way back. */
export function DestinationBanner() {
  const focus = useCameraStore((s) => s.focus);
  const moving = useCameraStore((s) => s.transitioning);
  if (focus?.kind !== "zone") return null;
  const zone = getZone(focus.zoneId);
  return (
    <section aria-label="Destination" className="flex items-center gap-4 rounded-md border border-line bg-surface p-3 shadow-pop">
      <span aria-hidden="true" className="h-10 w-1 rounded-full" style={{ background: zone.palette.accent }} />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.2em] text-mute">{moving ? "Heading to" : "You are in"}</p>
        <h2 className="font-display text-xl leading-tight">{zone.name}</h2>
        <p className="truncate text-xs text-mute">{zone.tagline}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => cameraManager.back()}>Return</Button>
    </section>
  );
}
