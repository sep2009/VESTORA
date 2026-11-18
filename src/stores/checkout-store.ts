"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CheckoutAddress = { fullName: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; phone: string };
export const EMPTY_ADDRESS: CheckoutAddress = { fullName: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "US", phone: "" };

/** Checkout progress for this browser tab only (sessionStorage). No payment details are ever stored; they are entered on the provider's page. */
type State = {
  step: number; customer: { email: string; name: string; phone: string }; address: CheckoutAddress; methodId: string | null; saveAddress: boolean;
  key: { value: string; sig: string } | null;
  patch: (p: Partial<Omit<State, "patch" | "reset">>) => void; reset: () => void;
};
const initial = { step: 0, customer: { email: "", name: "", phone: "" }, address: EMPTY_ADDRESS, methodId: null, saveAddress: false, key: null };
export const useCheckout = create<State>()(persist((set) => ({ ...initial, patch: (p) => set(p), reset: () => set(initial) }), { name: "vestora-checkout", storage: createJSONStorage(() => sessionStorage) }));
