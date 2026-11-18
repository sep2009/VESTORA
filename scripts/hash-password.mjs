// Usage: node scripts/hash-password.mjs "your password"
// Prints an ADMIN_PASSWORD_HASH value for .env.local. The password itself is never stored.
// Format: scrypt:N:r:p:salt:hash (colons, because .env loaders expand dollar signs).
import { randomBytes, scrypt } from "node:crypto";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error("Pass a password of at least 12 characters as the first argument.");
  process.exit(1);
}
const salt = randomBytes(16);
scrypt(pw, salt, 32, { N: 16384, r: 8, p: 1 }, (err, key) => {
  if (err) throw err;
  console.log(["scrypt", 16384, 8, 1, salt.toString("base64"), key.toString("base64")].join(":"));
});
