"use client";
import gsap from "gsap";
import type { PerspectiveCamera } from "three";
import type { OrbitControls } from "three-stdlib";
import { ZONES } from "../layout";
import type { DisplayPlacement, ZoneId } from "../types";
import { useCameraStore, type CameraMode, type Focus } from "@/stores/camera-store";
import { buildStops, displayPose, guidedPoseAt, lerpPose, overviewPose, poseDistance, zonePose, type Pose, type Stop, type V3 } from "./poses";

type Snapshot = { mode: CameraMode; focus: Focus | null; pose: Pose };
type LocationListener = (x: number, z: number, azimuth: number) => void;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const store = () => useCameraStore.getState();
const set = (patch: Partial<ReturnType<typeof store>>) => useCameraStore.setState(patch);

/**
 * The single owner of the camera. Guided scrolling, free exploration and focus moves all go
 * through here, so only one controller acts at a time and only one tween can ever be running.
 */
class CameraManager {
  private camera: PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private aspect = 1.6;
  private reduced = false;
  private tween: gsap.core.Tween | null = null;
  private stack: Snapshot[] = [];
  private stops: Stop[] = buildStops(1.6);
  private scroll = 0;
  private smooth = 0;
  private displays = new Map<string, DisplayPlacement>();
  private listeners = new Set<LocationListener>();
  private lastEmit = 0;
  readonly keys = new Set<string>();

  /* ───────── lifecycle ───────── */
  attach(camera: PerspectiveCamera, controls: OrbitControls, aspect: number, reduced: boolean) {
    this.camera = camera; this.controls = controls; this.aspect = aspect; this.reduced = reduced;
    this.stops = buildStops(aspect);
    this.smooth = this.scroll;
    this.syncGuidedInfo(this.stops.length ? guidedPoseAt(this.stops, this.scroll, reduced).index : 0);
    const mode = store().mode;
    const start = mode === "guided" ? guidedPoseAt(this.stops, this.scroll, reduced).pose : overviewPose(aspect);
    this.apply(start);
    this.settle();
  }
  detach() {
    this.killTween();
    this.keys.clear();
    this.camera = null; this.controls = null;
    set({ transitioning: false });
  }
  setAspect(aspect: number) {
    if (Math.abs(aspect - this.aspect) < 0.01) return;
    this.aspect = aspect;
    this.stops = buildStops(aspect);
  }
  setReduced(reduced: boolean) { this.reduced = reduced; }
  setDisplays(list: readonly DisplayPlacement[]) { this.displays = new Map(list.map((d) => [d.id, d])); }
  onLocation(fn: LocationListener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  /* ───────── scroll (guided) ───────── */
  setScrollProgress(p: number) { this.scroll = clamp(p, 0, 1); }
  get stopCount() { return this.stops.length; }
  /** 0..1 scroll position of a guided stop, used by the progress dots. */
  stopProgress(index: number) { return this.stops.length > 1 ? index / (this.stops.length - 1) : 0; }

  /* ───────── public commands ───────── */
  setMode(mode: CameraMode) {
    if (!this.camera) { set({ mode, focus: null }); return; }
    if (mode === "focus") { this.focusZone(store().currentZoneId ?? "new-arrivals"); return; }
    this.stack = [];
    set({ mode, focus: null, backDepth: 0 });
    if (mode === "guided") this.transition(() => this.guidedGoal());
    else { this.settle(); }
  }
  focusZone(id: ZoneId) {
    if (store().mode !== "focus") this.pushSnapshot();
    set({ mode: "focus", focus: { kind: "zone", zoneId: id }, currentZoneId: id, backDepth: this.stack.length });
    this.transition(() => zonePose(id, this.aspect));
  }
  focusDisplay(id: string) {
    const d = this.displays.get(id);
    if (!d) return;
    const cur = store().focus;
    if (cur?.kind === "display" && cur.displayId === id) { this.back(); return; }
    this.pushSnapshot();
    set({ mode: "focus", focus: { kind: "display", displayId: id, zoneId: d.departmentId }, currentZoneId: d.departmentId, backDepth: this.stack.length });
    this.transition(() => displayPose(d, this.aspect));
  }
  /** Undo one focus level, restoring exactly the camera state saved before it. */
  back() {
    const snap = this.stack.pop();
    if (!snap) { this.toOverview(); return; }
    set({ mode: snap.mode, focus: snap.focus, backDepth: this.stack.length, currentZoneId: snap.focus?.zoneId ?? store().currentZoneId });
    this.transition(snap.mode === "guided" ? () => this.guidedGoal() : () => snap.pose);
  }
  toOverview() {
    this.stack = [];
    set({ mode: "explore", focus: null, backDepth: 0 });
    this.transition(() => overviewPose(this.aspect));
  }
  /** Zoom by a factor (<1 in, >1 out), keeping the target. Used by the on-screen buttons. */
  zoom(factor: number) {
    if (!this.camera || !this.controls || this.tween || store().mode === "guided") return;
    const t = this.controls.target;
    const off = this.camera.position.clone().sub(t);
    const d = clamp(off.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(t).add(off.setLength(d));
    this.controls.update();
  }

  /* ───────── per-frame ───────── */
  update(dt: number) {
    const c = this.camera, ctl = this.controls;
    if (!c || !ctl) return;
    // The orbit controls attach their element after we do, so enforce touch behaviour here:
    // guided mode must let a vertical swipe scroll the page; explore/focus own the gesture.
    const want = store().mode === "guided" ? "pan-y" : "none";
    if (ctl.domElement && ctl.domElement.style.touchAction !== want) ctl.domElement.style.touchAction = want;
    if (!this.tween) {
      const mode = store().mode;
      if (mode === "guided") {
        const k = this.reduced ? 1 : 1 - Math.exp(-dt * 7);
        this.smooth += (this.scroll - this.smooth) * k;
        if (Math.abs(this.scroll - this.smooth) < 1e-4) this.smooth = this.scroll;
        const g = guidedPoseAt(this.stops, this.smooth, this.reduced);
        this.apply(g.pose);
        if (g.index !== store().guided.index || this.stops.length !== store().guided.count) this.syncGuidedInfo(g.index);
      } else if (this.keys.size) this.applyKeys(dt);
    }
    this.track(dt);
  }

  /* ───────── internals ───────── */
  private guidedGoal(): Pose { return guidedPoseAt(this.stops, this.smooth, this.reduced).pose; }
  private syncGuidedInfo(index: number) {
    const stop = this.stops[Math.min(index, this.stops.length - 1)];
    set({ guided: { index, count: this.stops.length, label: stop?.label ?? "" } });
  }
  private poseNow(): Pose {
    const c = this.camera!, t = this.controls!.target;
    return { pos: [c.position.x, c.position.y, c.position.z], target: [t.x, t.y, t.z] };
  }
  private apply(p: Pose) {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    this.controls.target.set(p.target[0], p.target[1], p.target[2]);
    this.controls.update();
  }
  private pushSnapshot() {
    if (!this.camera) return;
    const mode = store().mode;
    this.stack.push({ mode, focus: store().focus, pose: this.poseNow() });
  }
  private killTween() { this.tween?.kill(); this.tween = null; }

  /** The only place that animates the camera. Any running move is cancelled first. */
  private transition(goal: () => Pose) {
    if (!this.camera || !this.controls) return;
    this.killTween();
    const from = this.poseNow();
    const dur = this.reduced ? 0 : clamp(0.9 + poseDistance(from, goal()) / 70, 1.2, 2.6);
    if (dur === 0) { this.unlock(this.controls); this.apply(goal()); set({ transitioning: false }); this.settle(); return; }
    this.unlock(this.controls);
    set({ transitioning: true });
    const p = { k: 0 };
    this.tween = gsap.to(p, {
      k: 1, duration: dur, ease: "power3.inOut",
      onUpdate: () => this.apply(lerpPose(from, goal(), p.k)),
      onComplete: () => { this.tween = null; this.apply(goal()); set({ transitioning: false }); this.settle(); },
    });
  }

  /** While a move runs the orbit limits of the previous mode must not clamp it; settle() restores limits afterwards. */
  private unlock(ctl: OrbitControls) {
    ctl.enabled = false; ctl.enableDamping = false;
    ctl.minDistance = 0; ctl.maxDistance = Infinity;
    ctl.minPolarAngle = 0; ctl.maxPolarAngle = Math.PI;
    ctl.minAzimuthAngle = -Infinity; ctl.maxAzimuthAngle = Infinity;
  }

  /** Configure the orbit controls for the current mode once any move has finished. */
  private settle() {
    const c = this.camera, ctl = this.controls;
    if (!c || !ctl) return;
    const mode = store().mode;
    const off = c.position.clone().sub(ctl.target);
    const dist = off.length();
    const polar = Math.acos(clamp(off.y / (dist || 1), -1, 1));
    const az = Math.atan2(off.x, off.z);
    ctl.enablePan = false;
    if (ctl.domElement) ctl.domElement.style.touchAction = mode === "guided" ? "pan-y" : "none"; // guided: the page must still scroll on touch
    ctl.enabled = mode !== "guided";
    ctl.enableDamping = !this.reduced && mode !== "guided";
    ctl.dampingFactor = 0.08;
    if (mode === "focus") {
      ctl.minDistance = dist * 0.6; ctl.maxDistance = dist * 1.5;
      ctl.minPolarAngle = clamp(polar - 0.35, 0.3, 1.45); ctl.maxPolarAngle = clamp(polar + 0.3, 0.3, 1.45);
      ctl.minAzimuthAngle = az - 0.8; ctl.maxAzimuthAngle = az + 0.8;
    } else {
      // Dollhouse limits: stay on the cutaway side, above the floor. Widened if the current pose is already outside them.
      ctl.minDistance = Math.min(9, dist); ctl.maxDistance = Math.max(260, dist);
      ctl.minPolarAngle = Math.min(0.35, polar); ctl.maxPolarAngle = Math.max(1.32, polar);
      ctl.minAzimuthAngle = Math.min(-0.2, az); ctl.maxAzimuthAngle = Math.max(1.75, az);
    }
    ctl.update();
  }

  /** Keyboard: arrows orbit and tilt, + / - zoom. Frame-rate independent. */
  private applyKeys(dt: number) {
    const c = this.camera!, ctl = this.controls!;
    if (!ctl.enabled) return;
    const off = c.position.clone().sub(ctl.target);
    let dist = off.length();
    let polar = Math.acos(clamp(off.y / (dist || 1), -1, 1));
    let az = Math.atan2(off.x, off.z);
    const k = this.keys;
    if (k.has("ArrowLeft")) az -= 1.1 * dt;
    if (k.has("ArrowRight")) az += 1.1 * dt;
    if (k.has("ArrowUp")) polar -= 0.8 * dt;
    if (k.has("ArrowDown")) polar += 0.8 * dt;
    if (k.has("+") || k.has("=")) dist *= 1 - 0.9 * dt;
    if (k.has("-") || k.has("_")) dist *= 1 + 0.9 * dt;
    az = clamp(az, ctl.minAzimuthAngle, ctl.maxAzimuthAngle);
    polar = clamp(polar, ctl.minPolarAngle, ctl.maxPolarAngle);
    dist = clamp(dist, ctl.minDistance, ctl.maxDistance);
    c.position.set(ctl.target.x + dist * Math.sin(polar) * Math.sin(az), ctl.target.y + dist * Math.cos(polar), ctl.target.z + dist * Math.sin(polar) * Math.cos(az));
    ctl.update();
  }

  /** Which room the camera is looking at, and the location feed for the minimap (throttled). */
  private track(dt: number) {
    const c = this.camera!, t = this.controls!.target;
    this.lastEmit += dt;
    if (this.lastEmit < 0.06) return;
    this.lastEmit = 0;
    if (store().mode !== "focus") {
      let best: ZoneId | null = null, bd = Infinity;
      for (const z of ZONES) { const d = Math.hypot(t.x - z.center[0], t.z - z.center[1]); if (d < bd) { bd = d; best = z.id; } }
      if (best !== store().currentZoneId && bd < 14) set({ currentZoneId: best });
    }
    const az = Math.atan2(c.position.x - t.x, c.position.z - t.z);
    this.listeners.forEach((fn) => fn(t.x, t.z, az));
  }
}

export const cameraManager = new CameraManager();
export type { V3 };
