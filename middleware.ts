import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Content-Security-Policy met een per-request NONCE (sterker dan 'unsafe-inline'
// voor scripts). De nonce gaat via de request-headers mee zodat Next zijn eigen
// scripts noncet; 'strict-dynamic' laat door die scripts geladen chunks toe.
function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
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
