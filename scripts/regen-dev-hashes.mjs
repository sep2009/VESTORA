// Dev helper: re-hash the dev passwords recorded in .env.local (gitignored) using the current hash format. Prints nothing secret.
import { randomBytes, scrypt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const hash = (pw) => new Promise((resolve, reject) => {
  const salt = randomBytes(16);
  scrypt(pw, salt, 32, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(["scrypt", 16384, 8, 1, salt.toString("base64"), key.toString("base64")].join(":"))));
});

let env = readFileSync(".env.local", "utf8");
const admin = env.match(/# dev admin password:\s+(\S+)/)?.[1];
const editor = env.match(/# dev editor password:\s+(\S+)/)?.[1];
if (!admin || !editor) throw new Error("dev password comments not found in .env.local");
env = env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, "ADMIN_PASSWORD_HASH=" + (await hash(admin)));
env = env.replace(/^EDITOR_PASSWORD_HASH=.*$/m, "EDITOR_PASSWORD_HASH=" + (await hash(editor)));
writeFileSync(".env.local", env, { mode: 0o600 });
console.log("dev hashes regenerated");
