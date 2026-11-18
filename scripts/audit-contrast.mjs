// WCAG contrast of the design tokens used for text (src/app/globals.css). AA needs 4.5:1 for normal text.
import { readFileSync } from "node:fs";
const css = readFileSync("src/app/globals.css", "utf8");
const tok = {}; for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) tok[m[1]] ??= m[2]; // first definition = the light theme
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [["ink", "paper"], ["ink", "surface"], ["mute", "paper"], ["mute", "surface"], ["accent-ink", "paper"], ["accent-ink", "surface"], ["ok", "paper"], ["ok", "surface"], ["warn", "paper"], ["warn", "surface"], ["danger", "paper"], ["danger", "surface"], ["paper", "ink"]];
let fail = 0;
for (const [fg, bg] of pairs) { if (!tok[fg] || !tok[bg]) continue; const r = ratio(tok[fg], tok[bg]); const ok = r >= 4.5; if (!ok) fail++; console.log(`${ok ? "ok  " : "FAIL"} ${fg} on ${bg}: ${r.toFixed(2)}:1`); }
process.exit(fail ? 1 : 0);
