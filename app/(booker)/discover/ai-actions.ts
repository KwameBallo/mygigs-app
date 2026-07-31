"use server"

import { redirect } from "next/navigation"
import { getGenres } from "@/lib/data/artists"
import { parseSearchQuery } from "@/lib/ai/search"
import { rateLimit, clientIpFromHeaders } from "@/lib/ratelimit"

export async function aiSearch(formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "")
    .trim()
    .slice(0, 500)
  if (!prompt) redirect("/discover")

  // Rate limiting: AI-zoeken is een betaalde LLM-call (FIX #11).
  const ip = await clientIpFromHeaders()
  const rl = await rateLimit(ip, { limit: 15, windowSec: 60, scope: "aisearch" })
  if (!rl.ok) redirect("/discover")

  const genres = await getGenres()
  const parsed = await parseSearchQuery(prompt, genres)

  const params = new URLSearchParams()
  params.set("ai", prompt)
  if (parsed.q) params.set("q", parsed.q)
  if (parsed.city) params.set("city", parsed.city)
  if (parsed.genre) params.set("genre", parsed.genre)
  if (parsed.minFollowers) {
    params.set("minFollowers", String(parsed.minFollowers))
  }

  redirect(`/discover?${params.toString()}`)
}
