// Runs every automated check in order and prints one summary.  Needs the production server running with .env.local (see docs/DEPLOYMENT.md):
//   npm run build && npx next start -p 8765   then   npm test
import { spawnSync } from "node:child_process";
const steps = [
  ["type check", "npx", ["tsc", "--noEmit"]],
  ["lint", "npx", ["eslint", "src", "--max-warnings", "60"]],
  ["design contrast (WCAG AA)", "node", ["scripts/audit-contrast.mjs"]],
  ["outfit logic", "node", ["scripts/test-outfit-core.mjs"]],
  ["style quiz + recommendations", "node", ["scripts/test-style.mjs"]],
  ["stylist assistant", "node", ["scripts/test-assistant.mjs"]],
  ["virtual try-on backend", "node", ["scripts/e2e-tryon.mjs"]],
  ["stripe webhook helpers", "node", ["scripts/test-stripe-webhook.mjs"]],
  ["commerce end to end", "node", ["scripts/e2e-commerce.mjs"]],
  ["security audit", "node", ["scripts/audit-security.mjs"]],
  ["routes, links and static accessibility", "node", ["scripts/audit-routes.mjs"]],
];
const results = [];
for (const [name, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { encoding: "utf8", env: process.env });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.split("\n").filter((l) => !/Warning|trace-warnings|Reparsing|To eliminate/.test(l)).join("\n").trim();
  const last = out.split("\n").filter(Boolean).slice(-1)[0] ?? "";
  results.push([name, r.status === 0, last]);
  if (r.status !== 0) console.log(`\n--- ${name} ---\n${out.split("\n").slice(-12).join("\n")}`);
}
console.log("\n" + results.map(([n, ok, last]) => `${ok ? "PASS" : "FAIL"}  ${n.padEnd(40)} ${last.slice(0, 70)}`).join("\n"));
process.exit(results.every((r) => r[1]) ? 0 : 1);
