import "server-only"
import { headers } from "next/headers"

// Lichte rate limiter. Gebruikt Upstash Redis (REST) als UPSTASH_REDIS_REST_URL/
// _TOKEN zijn ingesteld — dat werkt betrouwbaar over serverless-instances heen.
// Zonder Upstash valt hij terug op een best-effort in-memory teller per instance
// (beter dan niets, maar niet gedeeld). Faalt "open" bij een limiter-fout.

type Result = { ok: boolean }

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
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
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
    if (!res.ok) return { ok: true }
    const data = (await res.json()) as Array<{ result?: number }>
    const count = Number(data?.[0]?.result ?? 0)
    return { ok: count <= limit }
  } catch {
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
