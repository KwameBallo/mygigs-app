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
}

export async function getGenres(): Promise<Genre[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("genres").select("*").order("name")
  return data ?? []
}

export async function getArtists(filters: ArtistFilters = {}): Promise<Artist[]> {
  const supabase = await createClient()
  let query = supabase
    .from("artists")
    .select("*, genres(*)")
    .order("online", { ascending: false })
    .order("rating", { ascending: false })

  if (filters.q) {
    query = query.ilike("stage_name", `%${filters.q}%`)
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
