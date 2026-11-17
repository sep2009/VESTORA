"use client";
import { useSyncExternalStore } from "react";

/** True only after hydration, so persisted client state never causes a mismatch. */
export function useMounted(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}
