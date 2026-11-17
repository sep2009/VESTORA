"use client";
import { create } from "zustand";

export type Toast = { id: number; message: string; tone: "info" | "success" | "error" };
type ToastState = {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
};

let next = 1;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "info") => set((s) => ({ toasts: [...s.toasts, { id: next++, message, tone }].slice(-4) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
