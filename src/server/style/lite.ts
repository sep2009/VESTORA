import "server-only";
import type { Discovery, Scored } from "@/modules/style/core";

/** What the browser needs to draw a recommendation: no internal fields, no stock numbers, no variant tables. */
export type LiteItem = {
  id: string; slug: string; name: string; brandName: string; categoryName: string; department: string; kind: string; image: string | null;
  price: { amount: number; currency: string } | null; compareAt: { amount: number; currency: string } | null; available: boolean; demo: boolean;
  color: string | null; match: number; explanation: string; slot: string | null; isNew: boolean;
};
export const lite = (s: Scored): LiteItem => ({ id: s.item.id, slug: s.item.slug, name: s.item.name, brandName: s.item.brandName, categoryName: s.item.categoryName, department: s.item.department, kind: s.item.kind, image: s.item.image, price: s.item.price, compareAt: s.item.compareAt, available: s.item.available, demo: s.item.demo, color: s.color, match: Math.round(s.score * 100), explanation: s.explanation, slot: s.item.slot, isNew: s.item.isNew });
export function liteDiscovery(d: Discovery) {
  return {
    personalized: d.personalized, meta: d.meta, top: d.top.map(lite), accessories: d.accessories.map(lite), newArrivals: d.newArrivals.map(lite), departments: d.departments,
    collections: d.collections.map((c) => ({ id: c.id, title: c.title, subtitle: c.subtitle, items: c.items.map(lite) })),
    outfits: d.outfits.map((o) => ({ id: o.id, name: o.name, why: o.why, match: o.match, picks: o.picks, items: o.items.map((e) => ({ ...lite(e.scored), color: e.color })) })),
  };
}
export type LiteDiscovery = ReturnType<typeof liteDiscovery>;
