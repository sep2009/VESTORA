// Crawls the running site: every reachable internal link must answer, every page needs a title, one h1, a language, labelled controls and alt text.
// Run (server up):  node scripts/audit-routes.mjs [baseUrl]
const BASE = process.argv[2] ?? "http://localhost:8765";
const seeds = ["/", "/shop", "/brands", "/categories", "/collections", "/favorites", "/cart", "/checkout", "/account", "/account/forgot", "/account/reset", "/style-creator", "/style-quiz", "/for-you", "/virtual-try-on", "/assistant", "/orders", "/design-system", "/admin/login"];
const seen = new Map(), queue = [...seeds], problems = [];
const bad = (url, msg) => problems.push(`${url}: ${msg}`);
let pass = 0;
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
while (queue.length && seen.size < 260) {
  const path = queue.shift(); if (seen.has(path)) continue;
  let res; try { res = await fetch(BASE + path, { redirect: "manual" }); } catch (e) { seen.set(path, 0); bad(path, "unreachable"); continue; }
  seen.set(path, res.status);
  if (res.status >= 300 && res.status < 400) { const loc = res.headers.get("location") ?? ""; if (!/^\/|^https?:\/\/localhost/.test(loc)) bad(path, `redirects off-site to ${loc}`); continue; }
  if (res.status >= 400) { bad(path, `HTTP ${res.status}`); continue; }
  const ct = res.headers.get("content-type") ?? ""; if (!ct.includes("text/html")) continue;
  const html = await res.text(), body = strip(html); pass++;
  if (!/<html[^>]*\slang="/.test(html)) bad(path, "no lang on <html>");
  if (!/<title>[^<]{3,}<\/title>/.test(html)) bad(path, "missing <title>");
  const h1 = (body.match(/<h1[\s>]/g) ?? []).length; if (h1 !== 1 && !path.startsWith("/admin")) bad(path, `${h1} <h1> elements`);
  for (const m of body.matchAll(/<img\b([^>]*)>/g)) if (!/\salt=/.test(m[1])) bad(path, "image without alt");
  for (const m of body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) { const text = m[2].replace(/<[^>]+>/g, "").trim(); if (!text && !/aria-label=|aria-labelledby=|title=/.test(m[1])) bad(path, "button without an accessible name"); }
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) { const text = m[2].replace(/<[^>]+>/g, "").trim(); if (!text && !/aria-label=|aria-labelledby=|title=/.test(m[1]) && !/<img[^>]+alt="[^"]+"/.test(m[2])) bad(path, `link without a name: ${(/href="([^"]*)"/.exec(m[1]) ?? [])[1]}`); }
  const wrapped = [...body.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map((m) => m[1]).filter((x) => /<input\b/.test(x)).length;
  const inputs = [...body.matchAll(/<input\b([^>]*)>/g)];
  const needLabel = (a) => !/type="(hidden|submit|button|checkbox|radio)"/.test(a) && !/aria-label=|aria-labelledby=/.test(a) && !(/\bid="([^"]+)"/.exec(a) && new RegExp(`for="${/\bid="([^"]+)"/.exec(a)[1]}"`).test(body));
  const unlabeled = inputs.filter((m) => needLabel(m[1])).length; // those left must be wrapped by a <label>
  if (unlabeled > wrapped) bad(path, `${unlabeled - wrapped} input(s) without a label`);
  for (const m of body.matchAll(/\shref="([^"#]+)(#[^"]*)?"/g)) {
    const h = m[1]; if (/^(mailto:|tel:|https?:|javascript:|data:)/.test(h) || !h.startsWith("/") || h.startsWith("/_next") || h.startsWith("/api/") || /\.(png|jpg|svg|ico|webp|css|js)$/.test(h)) continue;
    if (!seen.has(h)) queue.push(h);
  }
}
const statuses = [...seen.values()];
console.log(`crawled ${seen.size} URLs (${pass} HTML pages); ${statuses.filter((s) => s >= 400 || s === 0).length} broken`);
const uniq = [...new Set(problems)]; uniq.slice(0, 60).forEach((p) => console.log("PROBLEM", p)); if (uniq.length > 60) console.log(`… and ${uniq.length - 60} more`);
process.exit(uniq.length ? 1 : 0);
