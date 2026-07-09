import { createClient } from "@/lib/supabase/server"
import type { Tables, Enums } from "@/types/database"

export type Genre = Tables<"genres">
export type Artist = Tables<"artists"> & {
  genres: Genre | null
  // Prijs in de gekozen provincie (incl. reiskosten); alleen gevuld als er
  // op provincie gefilterd wordt.
  province_gage?: number | null
}

export type ArtistFilters = {
  q?: string
  genre?: string
  city?: string
  province?: string
  equipment?: string // "sound" | "light"
  act?: string
  minFollowers?: number
  budget?: number
  minRating?: number
  date?: string
}

export async function getGenres(): Promise<Genre[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("genres").select("*").order("name")
  return data ?? []
}

export async function getArtists(filters: ArtistFilters = {}): Promise<Artist[]> {
  const supabase = await createClient()

  // Datum-filter: sluit DJ's uit die op die dag al geboekt zijn.
  let bookedIds: string[] = []
  if (filters.date) {
    const { data: booked } = await supabase
      .from("artist_availability")
      .select("artist_id")
      .eq("date", filters.date)
      .eq("status", "booked")
    bookedIds = (booked ?? []).map((r) => r.artist_id)
  }

  // Genre-filter: match op álle stijlen van een DJ (artist_genres), niet
  // alleen de primaire genre_id.
  const genreId = filters.genre ? Number(filters.genre) : NaN
  let genreArtistIds: string[] = []
  if (!Number.isNaN(genreId)) {
    const { data: ag } = await supabase
      .from("artist_genres")
      .select("artist_id")
      .eq("genre_id", genreId)
    genreArtistIds = (ag ?? []).map((r) => r.artist_id)
  }

  // Provincie-filter: alleen DJ's die daar boekbaar zijn (rate ingesteld),
  // met hun totaalbedrag (incl. reiskosten) voor die provincie.
  let provinceRates: Map<string, number> | null = null
  if (filters.province) {
    const { data: pr } = await supabase
      .from("artist_province_rates")
      .select("artist_id, gage")
      .eq("province", filters.province)
    provinceRates = new Map((pr ?? []).map((r) => [r.artist_id, r.gage]))
    // Niemand boekbaar in deze provincie → lege resultatenset.
    if (provinceRates.size === 0) return []
  }

  // Beste reviews bovenaan (dan online, dan meeste boekingen).
  let query = supabase
    .from("artists")
    .select("*, genres(*)")
    .order("rating", { ascending: false })
    .order("online", { ascending: false })
    .order("total_bookings", { ascending: false })

  if (bookedIds.length > 0) {
    query = query.not("id", "in", `(${bookedIds.join(",")})`)
  }
  if (provinceRates) {
    query = query.in("id", [...provinceRates.keys()])
  }
  if (filters.minRating && filters.minRating > 0) {
    query = query.gte("rating", filters.minRating)
  }
  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, "")
    query = query.or(`stage_name.ilike.%${term}%,home_city.ilike.%${term}%`)
  }
  if (filters.city) {
    query = query.ilike("home_city", `%${filters.city}%`)
  }
  if (!Number.isNaN(genreId)) {
    // Primaire genre_id OF een van de gekoppelde stijlen.
    const idClause = genreArtistIds.length
      ? `,id.in.(${genreArtistIds.join(",")})`
      : ""
    query = query.or(`genre_id.eq.${genreId}${idClause}`)
  }
  if (filters.equipment === "sound") {
    query = query.eq("has_sound", true)
  } else if (filters.equipment === "light") {
    query = query.eq("has_light", true)
  }
  if (filters.act) {
    query = query.eq("act_type", filters.act as Enums<"act_type">)
  }
  if (filters.minFollowers && filters.minFollowers > 0) {
    query = query
      .gte("instagram_followers", filters.minFollowers)
      .order("instagram_followers", { ascending: false })
  }
  // Budget: in een gekozen provincie tellen we het provinciebedrag; anders de
  // basis-gage (server-side voorfilter).
  if (filters.budget && filters.budget > 0 && !provinceRates) {
    query = query.lte("base_gage", filters.budget)
  }

  const { data } = await query
  let rows = (data as Artist[] | null) ?? []

  if (provinceRates) {
    for (const a of rows) a.province_gage = provinceRates.get(a.id) ?? null
    if (filters.budget && filters.budget > 0) {
      rows = rows.filter((a) => (a.province_gage ?? a.base_gage) <= filters.budget!)
    }
    // Goedkoopste in de provincie eerst binnen de bestaande sortering blijft
    // secundair; we laten de reviews-sortering leidend.
  }

  return rows
}

export async function getArtist(id: string): Promise<Artist | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artists")
    .select("*, genres(*)")
    .eq("id", id)
    .maybeSingle()
  return (data as Artist | null) ?? null
}

// Public upcoming shows for an artist (privacy: no booker, no price).
export async function getPublicShows(artistId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from("bookings")
    .select("id, event_date, city, venue_name, start_time")
    .eq("artist_id", artistId)
    .eq("is_public", true)
    .in("status", ["accepted", "paid", "completed"])
    .gte("event_date", today)
    .order("event_date", { ascending: true })
  return data ?? []
}

export async function getArtistReviews(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .limit(10)
  return data ?? []
}
