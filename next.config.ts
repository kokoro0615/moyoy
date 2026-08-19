import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Adobe Fonts validates the requesting origin against the kit's registered domains
  // and answers 412 when no referrer is sent, so `no-referrer` would permanently block
  // the delivery path DA-ASSET-01 specifies. The origin-only policy keeps paths and
  // query strings private while letting the kit resolve.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()",
  },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
] as const;

const nextConfig: NextConfig = {
  // The dev server is intentionally reachable through both names used by local
  // browser checks. Next.js 16 validates the Origin host for internal dev assets;
  // without this, 127.0.0.1:3001 can render HTML but receives 403 for hydration JS.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...securityHeaders],
      },
    ];
  },
};

export default nextConfig;
