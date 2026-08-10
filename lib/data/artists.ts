import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeDjTier, startOfMonthISO, type DjTier } from "@/lib/dj-tier"
import type { Tables, Enums } from "@/types/database"

export type Genre = Tables<"genres">
export type Artist = Tables<"artists"> & {
  genres: Genre | null
  // Prijs in de gekozen provincie (incl. reiskosten); alleen gevuld als er
  // op provincie gefilterd wordt.
  province_gage?: number | null
  // Activiteitsrang (actief/gewild/hot) — organisatoren zien wie in trek is.
  tier?: DjTier | null
}

// Rekent per DJ de activiteitsrang uit op basis van bevestigde boekingen in de
// huidige kalendermaand (+ degradatie bij inactiviteit). Via de service-role:
// alleen tellingen/datums, geen persoonsgegevens.
async function attachTiers(artists: Artist[]) {
  if (artists.length === 0) return
  const ids = artists.map((a) => a.id)
  const { data: bk } = await createAdminClient()
    .from("bookings")
    .select("artist_id, created_at")
    .in("artist_id", ids)
    .in("status", ["accepted", "paid", "completed"])
    .gte("created_at", startOfMonthISO())

  const agg = new Map<string, { count: number; last: string }>()
  for (const b of bk ?? []) {
    const cur = agg.get(b.artist_id)
    if (!cur) agg.set(b.artist_id, { count: 1, last: b.created_at })
    else {
      cur.count++
      if (b.created_at > cur.last) cur.last = b.created_at
    }
  }
  for (const a of artists) {
    const info = agg.get(a.id)
    a.tier = computeDjTier(info?.count ?? 0, info?.last ?? null)
  }
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

  // Datum-filter: toon alleen DJ's die zich op die dag beschikbaar hebben
  // gemeld in hun agenda. Zo blijft de filterlijst in sync met de agenda:
  // niet-beschikbare (of geboekte) DJ's verschijnen niet.
  let availableIds: string[] | null = null
  if (filters.date) {
    const { data: avail } = await supabase
      .from("artist_availability")
      .select("artist_id")
      .eq("date", filters.date)
      .eq("status", "available")
    availableIds = (avail ?? []).map((r) => r.artist_id)
    // Niemand beschikbaar op die dag → lege resultatenset.
    if (availableIds.length === 0) return []
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
    .select("*, genres!artists_genre_id_fkey(*)")
    .order("rating", { ascending: false })
    .order("online", { ascending: false })
    .order("total_bookings", { ascending: false })

  if (availableIds) {
    query = query.in("id", availableIds)
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

  await attachTiers(rows)
  return rows
}

export type OrganiserPrefs = {
  province?: string | null
  budget?: number | null
  genreId?: number | null
  date?: string | null
}

// 'Aanbevolen': DJ's die passen bij de organisator-voorkeuren (regio, budget,
// stijl, datum) — gesorteerd op match en daarna op meeste boekingen. De
// voorkeuren zijn *zacht*: een lege of afwijkende voorkeur sluit niemand uit,
// maar betere matches komen bovenaan. De datum is (indien opgegeven) wél hard:
// we bevelen geen DJ aan die die dag niet beschikbaar is — tenzij niemand kan,
// dan tonen we alsnog de rest op boekingen.
export async function getRecommendedArtists(
  prefs: OrganiserPrefs,
): Promise<Artist[]> {
  let base = await getArtists(prefs.date ? { date: prefs.date } : {})
  if (prefs.date && base.length === 0) base = await getArtists({})

  // Stijl-match op álle genres van een DJ, niet alleen de primaire.
  let genreMatch: Set<string> | null = null
  if (prefs.genreId) {
    const supabase = await createClient()
    const { data: ag } = await supabase
      .from("artist_genres")
      .select("artist_id")
      .eq("genre_id", prefs.genreId)
    genreMatch = new Set((ag ?? []).map((r) => r.artist_id))
  }

  const scored = base.map((a) => {
    let score = 0
    if (prefs.province && a.province === prefs.province) score += 3
    if (
      prefs.genreId &&
      (a.genre_id === prefs.genreId || genreMatch?.has(a.id))
    )
      score += 2
    if (prefs.budget && a.base_gage <= prefs.budget) score += 2
    return { a, score }
  })
  scored.sort(
    (x, y) =>
      y.score - x.score ||
      (y.a.total_bookings ?? 0) - (x.a.total_bookings ?? 0) ||
      (y.a.rating ?? 0) - (x.a.rating ?? 0),
  )
  return scored.map((s) => s.a)
}

export async function getArtist(id: string): Promise<Artist | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artists")
    .select("*, genres!artists_genre_id_fkey(*)")
    .eq("id", id)
    .maybeSingle()
  const artist = (data as Artist | null) ?? null
  if (artist) await attachTiers([artist])
  return artist
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
