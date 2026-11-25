import { getCatalog, getProductBySlug } from "@/server/catalog/catalog";
import { kindForCategory } from "@/modules/catalog/kinds";
import { isDemo } from "@/modules/catalog/types";

export const dynamic = "force-dynamic";

const SHAPES: Record<string, (c: string, d: string) => string> = {
  top: (c, d) => `<path d="M150 120 L200 135 L250 120 L330 160 L300 215 L270 200 L270 400 L130 400 L130 200 L100 215 L70 160 Z" fill="${c}" stroke="${d}" stroke-width="3"/>`,
  hoodie: (c, d) => `<path d="M150 112 Q200 150 250 112 L330 165 L305 225 L272 205 L272 400 L128 400 L128 205 L95 225 L70 165 Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M150 112 Q200 70 250 112 Q200 150 150 112 Z" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="170" y="330" width="60" height="38" rx="8" fill="none" stroke="${d}" stroke-width="2.5"/>`,
  jacket: (c, d) => `<path d="M150 118 L200 140 L250 118 L335 165 L308 340 L282 332 L282 410 L118 410 L118 332 L92 340 L65 165 Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M200 140 L200 410" stroke="${d}" stroke-width="3"/><path d="M150 118 L178 160 L200 140 M250 118 L222 160 L200 140" fill="none" stroke="${d}" stroke-width="3"/>`,
  coat: (c, d) => `<path d="M148 112 L200 140 L252 112 L335 160 L318 360 L292 352 L300 440 L100 440 L108 352 L82 360 L65 160 Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M200 140 L200 440" stroke="${d}" stroke-width="3"/><path d="M148 112 L182 175 L200 140 M252 112 L218 175 L200 140" fill="none" stroke="${d}" stroke-width="3"/>`,
  dress: (c, d) => `<path d="M165 110 L235 110 L245 220 L320 410 L80 410 L155 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>`,
  trousers: (c, d) => `<path d="M135 110 L265 110 L290 410 L215 410 L200 230 L185 410 L110 410 Z" fill="${c}" stroke="${d}" stroke-width="3"/>`,
  shoe: (c, d) => `<path d="M70 330 L90 250 L150 270 L210 300 L300 320 L330 350 L330 375 L70 375 Z" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="70" y="372" width="262" height="18" rx="9" fill="#ece8e0" stroke="${d}" stroke-width="2"/>`,
  bag: (c, d) => `<rect x="100" y="210" width="200" height="170" rx="16" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M150 210 C150 130 250 130 250 210" fill="none" stroke="${d}" stroke-width="8"/>`,
  watch: (c, d) => `<rect x="170" y="90" width="60" height="320" rx="20" fill="#2a2420" stroke="${d}" stroke-width="2"/><circle cx="200" cy="250" r="62" fill="${c}" stroke="${d}" stroke-width="4"/><circle cx="200" cy="250" r="46" fill="#171717"/>`,
  eyewear: (c, d) => `<circle cx="140" cy="250" r="52" fill="none" stroke="${c}" stroke-width="10"/><circle cx="260" cy="250" r="52" fill="none" stroke="${c}" stroke-width="10"/><path d="M192 245 H208 M88 245 L50 230 M312 245 L350 230" stroke="${c}" stroke-width="8" fill="none"/>`,
};
/** The picture follows what the product IS (its catalog type), so shoes look like shoes and pants like pants. */
const SHAPE_OF_KIND: Record<string, string> = { tee: "top", shirt: "top", hoodie: "hoodie", jacket: "jacket", coat: "coat", suit: "jacket", trousers: "trousers", dress: "dress", sneaker: "shoe", bag: "bag", watch: "watch", glasses: "eyewear" };
const shapeFor = async (category: string) => SHAPE_OF_KIND[kindForCategory((await getCatalog()).categories, category)] ?? "top";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Placeholder artwork for DEMO records only. It is deliberately a plain labelled illustration, not a photo,
 * and it refuses to render for any non-demo record (those must use their own licensed images).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await ctx.params;
  const p = (await getProductBySlug(slug));
  if (!p || !isDemo(p)) return new Response("Not found", { status: 404 });
  const k = Math.max(1, Math.min(3, Number(n) || 1));
  const colour = p.colors[0]?.hex ?? "#b6b0a4";
  const bg = ["#ece8e0", "#dcd8cf", "#e4dfd5"][k - 1]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" aria-label="${esc(p.name)} (demo illustration)">
<rect width="400" height="500" fill="${bg}"/>
<g transform="${k === 2 ? "translate(400 0) scale(-1 1)" : k === 3 ? "translate(40 40) scale(0.9)" : ""}">${SHAPES[await shapeFor(p.category)]!(colour, "#2a2a2c")}</g>
<rect x="0" y="448" width="400" height="52" fill="#161618"/>
<text x="200" y="472" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="#e9e4d8" letter-spacing="3">DEMO PRODUCT</text>
<text x="200" y="490" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#a9a499">illustration · no real photography</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=0, must-revalidate" } });
}
