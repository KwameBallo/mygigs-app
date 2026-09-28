import "server-only"
import { headers } from "next/headers"

// Lichte rate limiter. Gebruikt Upstash Redis (REST) als de sleutels zijn
// ingesteld, dat werkt betrouwbaar over serverless-instances heen. Zonder
// Upstash valt hij terug op een best-effort teller in het geheugen van één
// instantie (beter dan niets, maar niet gedeeld). Faalt "open" bij een fout in
// de limiter zelf: liever een keer te veel doorlaten dan iedereen buitensluiten.
//
// De namen van de variabelen verschillen per manier van aansluiten. Koppel je
// Upstash via de marktplaats van Vercel, dan heten ze KV_REST_API_*; maak je ze
// zelf aan bij Upstash, dan heten ze UPSTASH_REDIS_REST_*. We accepteren beide,
// zodat het werkt zonder dat je handmatig sleutels hoeft over te typen.

type Result = { ok: boolean }

function redisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ""
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ""
  // Trim: een meegeplakte spatie of regeleinde maakt de hele teller stuk.
  const u = url.trim()
  const t = token.trim()
  return u && t ? { url: u.replace(/\/$/, ""), token: t } : null
}

const memory = new Map<string, { count: number; reset: number }>()

function memoryLimit(key: string, limit: number, windowSec: number): Result {
  const now = Date.now()
  const e = memory.get(key)
  if (!e || e.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 })
    return { ok: true }
  }
  e.count++
  return { ok: e.count <= limit }
}

async function upstashLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<Result | null> {
  const cfg = redisConfig()
  if (!cfg) return null
  const { url, token } = cfg
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    })
    if (!res.ok) {
      // Niet stil falen: anders denk je dat je een gedeelde teller hebt terwijl
      // elke poging wordt doorgelaten.
      console.error("[ratelimit] Upstash antwoordde met", res.status)
      return { ok: true }
    }
    const data = (await res.json()) as Array<{ result?: number }>
    const count = Number(data?.[0]?.result ?? 0)
    console.log("[ratelimit] teller", key, "staat op", count)
    return { ok: count <= limit }
  } catch (e) {
    console.error("[ratelimit] Upstash niet bereikbaar:", e)
    return { ok: true }
  }
}

export async function rateLimit(
  id: string,
  opts: { limit: number; windowSec: number; scope: string },
): Promise<Result> {
  const key = `rl:${opts.scope}:${id}`
  const viaUpstash = await upstashLimit(key, opts.limit, opts.windowSec)
  return viaUpstash ?? memoryLimit(key, opts.limit, opts.windowSec)
}

// Client-IP uit een route-handler-request (Vercel zet x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  return (xff?.split(",")[0] || "unknown").trim()
}

// Client-IP binnen een server action (via next/headers).
export async function clientIpFromHeaders(): Promise<string> {
  const h = await headers()
  const xff = h.get("x-forwarded-for")
  return (xff?.split(",")[0] || "unknown").trim()
}
