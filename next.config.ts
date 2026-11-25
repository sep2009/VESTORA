import type { NextConfig } from "next";

const prod = process.env.NODE_ENV === "production";

/**
 * Content Security Policy (production only; the dev server needs eval). Next.js inlines small bootstrap scripts, so 'unsafe-inline' is
 * required for scripts until nonces are wired in; everything else is locked to this origin. 'wasm-unsafe-eval' is for the Draco decoder.
 * Product and avatar images may come from https sources (affiliate feeds), so img-src allows https.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join("; ");

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  poweredByHeader: false,
  // Database drivers stay out of the bundle (PGlite is development/test only).
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ...(prod ? [{ key: "Content-Security-Policy", value: csp }, { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
      ],
    }, {
      // Decoder files and uploaded models never change under the same name.
      source: "/draco/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
};

export default config;
