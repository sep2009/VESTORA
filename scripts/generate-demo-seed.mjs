// Generates data/seed/demo.json: LABELLED DEMO DATA ONLY. Fictional brands, invented stock numbers, no real products or photos.
// The database seeds itself from this file on first run. Demo stock is NOT live inventory.
import { writeFileSync, mkdirSync } from "node:fs";

const brands = [["atlas-sport", "Atlas Sport"], ["stride-lab", "Stride Lab"], ["meridian-street", "Meridian Street"], ["maison-verde", "Maison Verde"], ["harbor-co", "Harbor & Co"], ["indigo-works", "Indigo Works"], ["courtland-tailoring", "Courtland Tailoring"], ["linea-accessori", "Linea Accessori"], ["northfield-studio", "Northfield Studio"]]
  .map(([slug, name]) => ({ slug, name, demo: true, website: null }));
const categories = [{ slug: "watches", name: "Watches", kind: "watch", parent: "accessories" }, { slug: "eyewear", name: "Eyewear", kind: "glasses", parent: "accessories" }];
const collections = [
  { slug: "new-season", name: "New season", description: "Demo collection: pieces that just arrived." },
  { slug: "essentials", name: "Essentials", description: "Demo collection: everyday basics." },
  { slug: "sale", name: "Sale", description: "Demo collection: reduced prices." },
  { slug: "denim-edit", name: "Denim edit", description: "Demo collection: indigo and selvedge." },
];
const colors = { black: ["Black", "#1c1c1e"], ivory: ["Ivory", "#ece6d8"], navy: ["Navy", "#1f2a44"], olive: ["Olive", "#5b6340"], sand: ["Sand", "#c9b697"], burgundy: ["Burgundy", "#6b2432"], charcoal: ["Charcoal", "#3a3a3d"], indigo: ["Indigo", "#2d3f66"], stone: ["Stone", "#b6b0a4"], forest: ["Forest", "#2f4a3a"], camel: ["Camel", "#b08a58"], slate: ["Slate blue", "#5a6f85"] };
const base = { "t-shirts": 3900, shirts: 7900, hoodies: 8900, jackets: 14900, coats: 34900, dresses: 18900, pants: 9900, jeans: 11900, suits: 39900, shoes: 12900, bags: 19900, watches: 24900, eyewear: 12900 };
const garmentSizes = ["XS", "S", "M", "L", "XL"], shoeSizes = ["40", "41", "42", "43", "44", "45"];
const materialsFor = { "t-shirts": ["Cotton"], shirts: ["Cotton", "Linen"], hoodies: ["Cotton", "Polyester"], jackets: ["Nylon", "Polyester"], coats: ["Wool", "Cashmere"], dresses: ["Silk", "Viscose"], pants: ["Cotton", "Elastane"], jeans: ["Cotton denim"], suits: ["Wool"], shoes: ["Leather", "Rubber"], bags: ["Leather"], watches: ["Stainless steel"], eyewear: ["Acetate"] };

const plan = {
  sportswear: ["atlas-sport", [["hoodies", "Training Hoodie", ["charcoal", "navy"]], ["t-shirts", "Performance Tee", ["black", "slate"]], ["jackets", "Track Jacket", ["navy", "black"]], ["pants", "Jogger Pants", ["charcoal", "olive"]], ["hoodies", "Zip Fleece", ["stone", "forest"]], ["t-shirts", "Seamless Tee", ["ivory", "black"]], ["jackets", "Wind Shell", ["slate", "black"]], ["pants", "Training Tapered Pants", ["black", "navy"]]]],
  sneakers: ["stride-lab", [["shoes", "Court Low", ["ivory", "black"]], ["shoes", "Runner Mesh", ["slate", "charcoal"]], ["shoes", "Trail Mid", ["olive", "sand"]], ["shoes", "Heritage High", ["black", "ivory"]], ["shoes", "Canvas Slip-on", ["navy", "stone"]], ["shoes", "Leather Court", ["ivory", "camel"]], ["shoes", "Retro Runner", ["burgundy", "stone"]], ["shoes", "Studio Knit", ["charcoal", "ivory"]]]],
  streetwear: ["meridian-street", [["hoodies", "Heavyweight Hoodie", ["black", "stone"]], ["t-shirts", "Boxy Tee", ["ivory", "olive"]], ["jackets", "Coach Jacket", ["black", "burgundy"]], ["pants", "Cargo Pants", ["olive", "black"]], ["hoodies", "Oversized Crew", ["charcoal", "sand"]], ["t-shirts", "Graphic Tee", ["black", "ivory"]], ["jackets", "Quilted Liner", ["navy", "olive"]], ["pants", "Wide Utility Pants", ["stone", "black"]]]],
  luxury: ["maison-verde", [["coats", "Wool Overcoat", ["camel", "charcoal"]], ["dresses", "Silk Evening Dress", ["burgundy", "black"]], ["jackets", "Tailored Blazer", ["black", "navy"]], ["bags", "Leather Handbag", ["camel", "black"]], ["coats", "Cashmere Coat", ["stone", "navy"]], ["dresses", "Pleated Dress", ["ivory", "forest"]], ["bags", "Structured Shoulder Bag", ["burgundy", "black"]], ["watches", "Steel Dress Watch", ["stone"]]]],
  casual: ["harbor-co", [["t-shirts", "Everyday Tee", ["ivory", "navy", "olive"]], ["shirts", "Linen Shirt", ["sand", "slate"]], ["hoodies", "Relaxed Hoodie", ["stone", "forest"]], ["pants", "Chino Pants", ["sand", "navy"]], ["t-shirts", "Pocket Tee", ["slate", "ivory"]], ["shirts", "Striped Shirt", ["slate", "ivory"]], ["jackets", "Field Jacket", ["olive", "sand"]], ["pants", "Easy Pants", ["stone", "charcoal"]]]],
  formal: ["courtland-tailoring", [["suits", "Navy Two-piece Suit", ["navy"]], ["suits", "Charcoal Suit", ["charcoal"]], ["suits", "Black Dinner Suit", ["black"]], ["shirts", "Poplin Dress Shirt", ["ivory", "slate"]], ["shirts", "Oxford Dress Shirt", ["ivory", "navy"]], ["dresses", "Evening Gown", ["burgundy", "navy"]], ["dresses", "Satin Midi Dress", ["forest", "black"]], ["pants", "Wool Dress Pants", ["charcoal", "navy"]]]],
  denim: ["indigo-works", [["jeans", "Straight Jeans", ["indigo", "black"]], ["jeans", "Slim Jeans", ["indigo", "slate"]], ["jeans", "Relaxed Jeans", ["indigo", "stone"]], ["jeans", "Wide Leg Jeans", ["slate", "indigo"]], ["jeans", "Selvedge Jeans", ["indigo"]], ["jackets", "Denim Trucker Jacket", ["indigo", "slate"]], ["jackets", "Sherpa Denim Jacket", ["indigo", "camel"]], ["shirts", "Chambray Shirt", ["slate", "ivory"]]]],
  accessories: ["linea-accessori", [["bags", "Crossbody Bag", ["black", "camel"]], ["bags", "Canvas Tote", ["sand", "navy"]], ["bags", "Leather Backpack", ["black", "burgundy"]], ["watches", "Field Watch", ["olive", "black"]], ["watches", "Minimal Watch", ["stone", "black"]], ["eyewear", "Round Glasses", ["black", "camel"]], ["eyewear", "Square Sunglasses", ["black", "burgundy"]], ["eyewear", "Aviator Sunglasses", ["stone", "black"]]]],
  "new-arrivals": ["northfield-studio", [["coats", "Season Opener Coat", ["camel", "black"]], ["dresses", "Launch Dress", ["ivory", "forest"]], ["jackets", "Debut Jacket", ["slate", "olive"]], ["shoes", "Fresh Court Sneaker", ["ivory", "sand"]], ["hoodies", "Capsule Hoodie", ["burgundy", "charcoal"]], ["bags", "Fresh Tote", ["sand", "black"]], ["jeans", "Capsule Jeans", ["indigo", "stone"]], ["shirts", "Opening Shirt", ["ivory", "sand"]]]],
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const audienceOf = (cat, name) => (cat === "dresses" ? "women" : cat === "suits" ? "men" : /Gown|Midi/.test(name) ? "women" : "unisex");
const products = [];
let n = 0;
for (const [department, [brand, items]] of Object.entries(plan)) {
  items.forEach(([category, name, cols]) => {
    n++;
    const mult = department === "luxury" ? 3 : 0.85 + ((n * 37) % 40) / 100;
    const amount = Math.round((base[category] * mult) / 100) * 100;
    const slug = `${slugify(name)}-${brand}`;
    const sizes = category === "shoes" ? shoeSizes : ["bags", "watches", "eyewear"].includes(category) ? [null] : garmentSizes;
    const variants = [];
    cols.forEach((c, ci) => sizes.forEach((s, si) => variants.push({ sku: `D${String(n).padStart(3, "0")}-${c.slice(0, 3).toUpperCase()}${s ? `-${s}` : ""}`, size: s, color: colors[c][0], stock: (n * 7 + ci * 5 + si * 3) % 9 === 0 ? 0 : 2 + ((n + si * 2 + ci) % 11) })));
    // every 7th product is entirely out of stock so the sold-out state can be tested
    if (n % 7 === 3) variants.forEach((v) => (v.stock = 0));
    const stock = variants.reduce((a, v) => a + v.stock, 0);
    const sale = n % 8 === 2 ? Math.round((amount * 0.8) / 100) * 100 : null;
    const colls = [department === "new-arrivals" ? "new-season" : null, ["t-shirts", "shirts", "pants"].includes(category) ? "essentials" : null, sale ? "sale" : null, department === "denim" ? "denim-edit" : null].filter(Boolean);
    products.push({
      id: `demo-${String(n).padStart(3, "0")}`, slug, name, brand, department, category, audience: audienceOf(category, name),
      description: `DEMO PRODUCT used to test the store. This is not a real item, price, photograph or stock level (${category}, ${department}).`,
      collections: colls, tags: ["demo", category, department], materials: materialsFor[category], featured: n % 9 === 1,
      images: [1, 2, 3].map((k) => ({ url: `/api/demo-image/${slug}/${k}`, alt: `${name}, demo illustration ${k}`, credit: "Vestora demo illustration", license: "demo" })),
      model3d: null,
      price: { amount, currency: "USD" }, salePrice: sale ? { amount: sale, currency: "USD" } : null,
      variants, sizes: null, colors: cols.map((c) => ({ name: colors[c][0], hex: colors[c][1] })), colorsVerified: true,
      availability: stock > 0 ? "in_stock" : "out_of_stock", showInMall: true,
      source: { kind: "demo", retailer: null, url: null, retrievedAt: null },
    });
  });
}
mkdirSync("data/seed", { recursive: true });
writeFileSync("data/seed/demo.json", JSON.stringify({ brands, categories, collections, products }, null, 2) + "\n");
console.log(`wrote ${products.length} demo products, ${brands.length} demo brands, ${collections.length} collections, featured=${products.filter((p) => p.featured).length}, on sale=${products.filter((p) => p.salePrice).length}`);
