import { createClient } from "@/lib/supabase/server"
import type { Tables, Enums } from "@/types/database"

export type Genre = Tables<"genres">
export type Artist = Tables<"artists"> & { genres: Genre | null }

export type ArtistFilters = {
  q?: string
  genre?: string
  city?: string
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
  if (filters.genre) {
    const genreId = Number(filters.genre)
    if (!Number.isNaN(genreId)) query = query.eq("genre_id", genreId)
  }
  if (filters.act) {
    query = query.eq("act_type", filters.act as Enums<"act_type">)
  }
  if (filters.minFollowers && filters.minFollowers > 0) {
    query = query
      .gte("instagram_followers", filters.minFollowers)
      .order("instagram_followers", { ascending: false })
  }
  if (filters.budget && filters.budget > 0) {
    query = query.lte("base_gage", filters.budget)
  }

  const { data } = await query
  return (data as Artist[] | null) ?? []
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
