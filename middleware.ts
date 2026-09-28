import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Content-Security-Policy met een per-request NONCE (sterker dan 'unsafe-inline'
// voor scripts). De nonce gaat via de request-headers mee zodat Next zijn eigen
// scripts noncet; 'strict-dynamic' laat door die scripts geladen chunks toe.
//
// In development heeft React/Turbopack eval() nodig voor de dev-overlay en
// hot reload, en loopt HMR over een ws:-verbinding. Die twee versoepelingen
// staan daarom achter een NODE_ENV-check: in productie blijft het beleid
// precies zo streng als het was.
const isDev = process.env.NODE_ENV === "development"

// Turnstile van Cloudflare tekent zijn vakje in een eigen iframe en laadt
// daarvoor een script van deze host. Zonder deze uitzondering blokkeert het
// beleid het vakje zonder zichtbare foutmelding.
const TURNSTILE = "https://challenges.cloudflare.com"

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    // 'strict-dynamic' laat scripts toe die door een vertrouwd script geladen
    // worden; de host erbij is de terugval voor oudere browsers die
    // 'strict-dynamic' niet kennen.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https: wss:${isDev ? " ws:" : ""}`,
    `frame-src 'self' ${TURNSTILE}`,
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ")
}

export async function middleware(request: NextRequest) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = btoa(String.fromCharCode(...bytes))
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("content-security-policy", csp)

  const response = await updateSession(request, requestHeaders)
  response.headers.set("content-security-policy", csp)
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
