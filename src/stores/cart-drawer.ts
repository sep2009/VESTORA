"use client";
import { create } from "zustand";

export const useCartDrawer = create<{ open: boolean; set: (open: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));
