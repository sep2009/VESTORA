// Generates data/catalog/demo.json: TEST DATA ONLY. Fictional brands, no real products, no real photography.
// Delete data/catalog/demo.json once a real feed or manually verified file is in place.
import { writeFileSync } from "node:fs";

const brands = [
  ["atlas-sport", "Atlas Sport"], ["stride-lab", "Stride Lab"], ["meridian-street", "Meridian Street"], ["maison-verde", "Maison Verde"],
  ["harbor-co", "Harbor & Co"], ["indigo-works", "Indigo Works"], ["courtland-tailoring", "Courtland Tailoring"], ["linea-accessori", "Linea Accessori"], ["northfield-studio", "Northfield Studio"],
].map(([slug, name]) => ({ slug, name, demo: true, website: null }));

const colors = { black: ["Black", "#1c1c1e"], ivory: ["Ivory", "#ece6d8"], navy: ["Navy", "#1f2a44"], olive: ["Olive", "#5b6340"], sand: ["Sand", "#c9b697"], burgundy: ["Burgundy", "#6b2432"], charcoal: ["Charcoal", "#3a3a3d"], indigo: ["Indigo", "#2d3f66"], stone: ["Stone", "#b6b0a4"], forest: ["Forest", "#2f4a3a"], camel: ["Camel", "#b08a58"], slate: ["Slate blue", "#5a6f85"] };
const base = { "t-shirts": 3900, shirts: 7900, hoodies: 8900, jackets: 14900, coats: 34900, dresses: 18900, trousers: 9900, jeans: 11900, suits: 39900, sneakers: 12900, bags: 19900, watches: 24900, eyewear: 12900 };
const garmentSizes = ["XS", "S", "M", "L", "XL"], shoeSizes = ["40", "41", "42", "43", "44", "45"];

// department -> [brand, [category, name, [colour keys]]...]
const plan = {
  sportswear: ["atlas-sport", [["hoodies", "Training Hoodie", ["charcoal", "navy"]], ["t-shirts", "Performance Tee", ["black", "slate"]], ["jackets", "Track Jacket", ["navy", "black"]], ["trousers", "Jogger Trousers", ["charcoal", "olive"]], ["hoodies", "Zip Fleece", ["stone", "forest"]], ["t-shirts", "Seamless Tee", ["ivory", "black"]], ["jackets", "Wind Shell", ["slate", "black"]], ["trousers", "Training Tapered Trousers", ["black", "navy"]]]],
  sneakers: ["stride-lab", [["sneakers", "Court Low", ["ivory", "black"]], ["sneakers", "Runner Mesh", ["slate", "charcoal"]], ["sneakers", "Trail Mid", ["olive", "sand"]], ["sneakers", "Heritage High", ["black", "ivory"]], ["sneakers", "Canvas Slip-on", ["navy", "stone"]], ["sneakers", "Leather Court", ["ivory", "camel"]], ["sneakers", "Retro Runner", ["burgundy", "stone"]], ["sneakers", "Studio Knit", ["charcoal", "ivory"]]]],
  streetwear: ["meridian-street", [["hoodies", "Heavyweight Hoodie", ["black", "stone"]], ["t-shirts", "Boxy Tee", ["ivory", "olive"]], ["jackets", "Coach Jacket", ["black", "burgundy"]], ["trousers", "Cargo Trousers", ["olive", "black"]], ["hoodies", "Oversized Crew", ["charcoal", "sand"]], ["t-shirts", "Graphic Tee", ["black", "ivory"]], ["jackets", "Quilted Liner", ["navy", "olive"]], ["trousers", "Wide Utility Trousers", ["stone", "black"]]]],
  luxury: ["maison-verde", [["coats", "Wool Overcoat", ["camel", "charcoal"]], ["dresses", "Silk Evening Dress", ["burgundy", "black"]], ["jackets", "Tailored Blazer", ["black", "navy"]], ["bags", "Leather Handbag", ["camel", "black"]], ["coats", "Cashmere Coat", ["stone", "navy"]], ["dresses", "Pleated Dress", ["ivory", "forest"]], ["bags", "Structured Shoulder Bag", ["burgundy", "black"]], ["watches", "Steel Dress Watch", ["stone"]]]],
  casual: ["harbor-co", [["t-shirts", "Everyday Tee", ["ivory", "navy", "olive"]], ["shirts", "Linen Shirt", ["sand", "slate"]], ["hoodies", "Relaxed Hoodie", ["stone", "forest"]], ["trousers", "Chino Trousers", ["sand", "navy"]], ["t-shirts", "Pocket Tee", ["slate", "ivory"]], ["shirts", "Striped Shirt", ["slate", "ivory"]], ["jackets", "Field Jacket", ["olive", "sand"]], ["trousers", "Easy Trousers", ["stone", "charcoal"]]]],
  formal: ["courtland-tailoring", [["suits", "Navy Two-piece Suit", ["navy"]], ["suits", "Charcoal Suit", ["charcoal"]], ["suits", "Black Dinner Suit", ["black"]], ["shirts", "Poplin Dress Shirt", ["ivory", "slate"]], ["shirts", "Oxford Dress Shirt", ["ivory", "navy"]], ["dresses", "Evening Gown", ["burgundy", "navy"]], ["dresses", "Satin Midi Dress", ["forest", "black"]], ["trousers", "Wool Dress Trousers", ["charcoal", "navy"]]]],
  denim: ["indigo-works", [["jeans", "Straight Jeans", ["indigo", "black"]], ["jeans", "Slim Jeans", ["indigo", "slate"]], ["jeans", "Relaxed Jeans", ["indigo", "stone"]], ["jeans", "Wide Leg Jeans", ["slate", "indigo"]], ["jeans", "Selvedge Jeans", ["indigo"]], ["jackets", "Denim Trucker Jacket", ["indigo", "slate"]], ["jackets", "Sherpa Denim Jacket", ["indigo", "camel"]], ["shirts", "Chambray Shirt", ["slate", "ivory"]]]],
  accessories: ["linea-accessori", [["bags", "Crossbody Bag", ["black", "camel"]], ["bags", "Canvas Tote", ["sand", "navy"]], ["bags", "Leather Backpack", ["black", "burgundy"]], ["watches", "Field Watch", ["olive", "black"]], ["watches", "Minimal Watch", ["stone", "black"]], ["eyewear", "Round Glasses", ["black", "camel"]], ["eyewear", "Square Sunglasses", ["black", "burgundy"]], ["eyewear", "Aviator Sunglasses", ["stone", "black"]]]],
  "new-arrivals": ["northfield-studio", [["coats", "Season Opener Coat", ["camel", "black"]], ["dresses", "Launch Dress", ["ivory", "forest"]], ["jackets", "Debut Jacket", ["slate", "olive"]], ["sneakers", "Fresh Court Sneaker", ["ivory", "sand"]], ["hoodies", "Capsule Hoodie", ["burgundy", "charcoal"]], ["bags", "Fresh Tote", ["sand", "black"]], ["jeans", "Capsule Jeans", ["indigo", "stone"]], ["shirts", "Opening Shirt", ["ivory", "sand"]]]],
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const products = [];
let n = 0;
for (const [department, [brand, items]] of Object.entries(plan)) {
  items.forEach(([category, name, cols], i) => {
    n++;
    const mult = department === "luxury" ? 3 : 0.85 + ((n * 37) % 40) / 100;
    const amount = Math.round((base[category] * mult) / 100) * 100;
    const slug = `${slugify(name)}-${brand}`;
    products.push({
      id: `demo-${String(n).padStart(3, "0")}`,
      slug, name, brand, department, category,
      description: `DEMO PRODUCT used to test the store. This is not a real item, price or photograph (${category}, ${department}).`,
      images: [1, 2, 3].map((k) => ({ url: `/api/demo-image/${slug}/${k}`, alt: `${name}, demo illustration ${k}`, credit: "Vestora demo illustration", license: "demo" })),
      price: { amount, currency: "USD" },
      sizes: category === "sneakers" ? { values: shoeSizes, verified: true } : ["bags", "watches", "eyewear"].includes(category) ? null : { values: garmentSizes, verified: true },
      colors: cols.map((c) => ({ name: colors[c][0], hex: colors[c][1] })),
      colorsVerified: true,
      availability: n % 7 === 3 ? "out_of_stock" : n % 11 === 5 ? "unknown" : "in_stock",
      source: { kind: "demo", retailer: null, url: null, retrievedAt: null },
    });
  });
}
writeFileSync("data/catalog/demo.json", JSON.stringify({ brands, products }, null, 2) + "\n");
console.log(`wrote ${products.length} demo products, ${brands.length} demo brands`);
