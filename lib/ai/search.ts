import type { Genre } from "@/lib/data/artists"

export type ParsedSearch = {
  q?: string
  city?: string
  genre?: string
  minFollowers?: number
}

const CITY_PREPOSITIONS =
  /(?:in|omgeving|rond|regio|nabij|buurt van|dichtbij|uit|te)\s+([a-zà-ÿ'-]+(?:\s+[a-zà-ÿ'-]+)?)/i

const KNOWN_CITIES = [
  "amsterdam", "rotterdam", "utrecht", "den haag", "eindhoven",
  "groningen", "tilburg", "almere", "breda", "nijmegen", "haarlem",
  "arnhem", "enschede", "amersfoort", "zwolle", "leiden", "maastricht",
  "delft", "alkmaar", "venlo", "deventer", "hilversum",
]

function parseFollowers(query: string): number | undefined {
  const m = query.match(
    /(\d[\d.,\s]*)\s*(k|duizend|mln|miljoen)?\s*\+?\s*(?:volgers|volger|followers|fans)/i,
  )
  if (!m) return undefined

  let n = Number(m[1].replace(/[.,\s]/g, ""))
  if (Number.isNaN(n)) return undefined

  const unit = m[2]?.toLowerCase()
  if (unit === "k" || unit === "duizend") n *= 1000
  if (unit === "mln" || unit === "miljoen") n *= 1_000_000
  return n > 0 ? n : undefined
}

function parseCity(query: string): string | undefined {
  const lower = query.toLowerCase()

  const found = KNOWN_CITIES.find((c) => lower.includes(c))
  if (found) {
    return found
      .split(" ")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ")
  }

  const m = query.match(CITY_PREPOSITIONS)
  if (m) {
    const candidate = m[1].trim()
    const stop = ["met", "die", "van", "voor", "een", "minimaal", "minstens"]
    if (!stop.includes(candidate.toLowerCase())) {
      return candidate
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ")
    }
  }
  return undefined
}

function parseGenre(query: string, genres: Genre[]): string | undefined {
  const lower = query.toLowerCase()
  const hit = genres.find((g) => lower.includes(g.name.toLowerCase()))
  return hit ? String(hit.id) : undefined
}

// Heuristic Dutch parser. Always available, no external calls.
export function parseSearchHeuristic(
  query: string,
  genres: Genre[],
): ParsedSearch {
  return {
    minFollowers: parseFollowers(query),
    city: parseCity(query),
    genre: parseGenre(query, genres),
  }
}

// Optional LLM upgrade: used only when ANTHROPIC_API_KEY is set.
// Falls back to the heuristic on any error so search never breaks.
export async function parseSearchQuery(
  query: string,
  genres: Genre[],
): Promise<ParsedSearch> {
  const key = process.env.ANTHROPIC_API_KEY
  const fallback = parseSearchHeuristic(query, genres)
  if (!key) return fallback

  try {
    const genreList = genres.map((g) => `${g.id}=${g.name}`).join(", ")
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system:
          "Je zet een Nederlandse zoekopdracht naar artiesten om in JSON-filters. " +
          `Beschikbare genres (id=naam): ${genreList}. ` +
          "Geef ALLEEN geldige JSON terug met optionele velden: " +
          "q (string, naam-zoekterm), city (string, stad), genre (string, genre-id), " +
          "minFollowers (getal, minimale Instagram-volgers). " +
          "Laat velden weg die niet voorkomen. Geen uitleg, alleen JSON.",
        messages: [{ role: "user", content: query }],
      }),
    })

    if (!res.ok) return fallback
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return fallback

    const parsed = JSON.parse(match[0]) as ParsedSearch
    return {
      q: typeof parsed.q === "string" ? parsed.q : undefined,
      city: typeof parsed.city === "string" ? parsed.city : fallback.city,
      genre: parsed.genre ? String(parsed.genre) : fallback.genre,
      minFollowers:
        typeof parsed.minFollowers === "number"
          ? parsed.minFollowers
          : fallback.minFollowers,
    }
  } catch {
    return fallback
  }
}
