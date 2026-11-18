"use client";
import { useEffect } from "react";
import { useStyle } from "@/stores/style-store";

/** Counts a product view on this device, only if the shopper turned on "Products I look at". */
export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => { useStyle.getState().recordView(productId); }, [productId]);
  return null;
}
