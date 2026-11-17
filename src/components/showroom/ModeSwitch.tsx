"use client";
import { useCameraStore, type CameraMode } from "@/stores/camera-store";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { cn } from "@/lib/cn";

const MODES: { mode: CameraMode; label: string; hint: string }[] = [
  { mode: "guided", label: "Guided", hint: "Scroll to be taken through the mall" },
  { mode: "explore", label: "Explore", hint: "Look around freely" },
  { mode: "focus", label: "Focus", hint: "Go close to the room you are in" },
];

/** The only control that changes the navigation mode. Large touch targets on small screens. */
export function ModeSwitch() {
  const mode = useCameraStore((s) => s.mode);
  return (
    <div role="group" aria-label="Navigation mode" className="inline-flex rounded-md border border-line bg-surface/95 p-1 shadow-card backdrop-blur">
      {MODES.map((m) => (
        <button key={m.mode} type="button" aria-pressed={mode === m.mode} title={m.hint} onClick={() => cameraManager.setMode(m.mode)}
          className={cn("min-h-11 rounded-sm px-4 text-xs font-medium uppercase tracking-[0.14em] sm:min-h-9 sm:px-3.5",
            mode === m.mode ? "bg-ink text-paper" : "text-mute hover:text-ink")}>
          {m.label}
        </button>
      ))}
    </div>
  );
}
