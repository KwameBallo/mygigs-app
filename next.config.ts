import type { NextConfig } from "next"

// Security headers (ISO/IEC 27001:2022 Annex A 8.20/8.23/8.26 — netwerk- en
// applicatiebeveiliging). Beschermen tegen clickjacking, MIME-sniffing,
// protocol-downgrade en beperken welke bronnen de browser mag laden.
const securityHeaders = [
  // Forceer HTTPS voor 2 jaar, inclusief subdomeinen (HSTS).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Geen MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Geen embedding in iframes van derden (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Beperk referrer-informatie naar externe sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Schakel ongebruikte, gevoelige browser-API's uit.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Content Security Policy: beperk de herkomst van scripts, stijlen en data.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  // Verberg de framework-versie in de response-headers (information disclosure).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
