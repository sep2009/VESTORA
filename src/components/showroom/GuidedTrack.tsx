"use client";
import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cameraManager } from "@/modules/showroom/camera/manager";

gsap.registerPlugin(ScrollTrigger);

let trigger: ScrollTrigger | null = null;

/** Scrolls the page to a guided stop. The camera follows the scroll, so it travels there along the tour. */
export function seekGuidedStop(index: number, reduced = false) {
  if (!trigger) return;
  const y = trigger.start + (trigger.end - trigger.start) * cameraManager.stopProgress(index);
  window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
}

/**
 * The single ScrollTrigger of the page. It only reports progress through the tall track; the camera
 * manager smooths it and decides what to do with it. Created when guided mode is on, reverted when off.
 */
export function GuidedTrack({ track, active, top = 72 }: { track: RefObject<HTMLElement | null>; active: boolean; top?: number }) {
  useEffect(() => {
    const el = track.current;
    if (!active || !el) return;
    const ctx = gsap.context(() => {
      trigger = ScrollTrigger.create({
        trigger: el, start: `top ${top + 4}px`, end: "bottom bottom", invalidateOnRefresh: true,
        onUpdate: (self) => cameraManager.setScrollProgress(self.progress),
        onRefresh: (self) => cameraManager.setScrollProgress(self.progress),
      });
    }, el);
    ScrollTrigger.refresh();
    return () => { ctx.revert(); trigger = null; };
  }, [active, track, top]);
  return null;
}
